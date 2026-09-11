import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { OrderModel } from "../models/Order";
import { ProductModel } from "../models/Product";

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const DEFAULT_DAYS = 30;

const parsePositiveNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const getDashboardOverview = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const days = Math.min(
      parsePositiveNumber(req.query.days, DEFAULT_DAYS),
      365,
    );
    const lowStockThreshold = Math.min(
      parsePositiveNumber(
        req.query.lowStockThreshold,
        DEFAULT_LOW_STOCK_THRESHOLD,
      ),
      1000,
    );
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const orderFilter = { user: userId };
    const [
      totalProducts,
      featuredProducts,
      lowStockProducts,
      totalOrders,
      revenueResult,
      ordersByStatus,
      revenueByDay,
      topCategories,
      recentOrders,
    ] = await Promise.all([
      ProductModel.countDocuments(),
      ProductModel.countDocuments({ isFeatured: true }),
      ProductModel.find({ stock: { $lt: lowStockThreshold } })
        .select("name category brand stock price image")
        .sort({ stock: 1 })
        .limit(10),
      OrderModel.countDocuments(orderFilter),
      OrderModel.aggregate([
        { $match: { ...orderFilter, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      OrderModel.aggregate([
        { $match: orderFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      OrderModel.aggregate([
        {
          $match: {
            ...orderFilter,
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
              },
            },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ProductModel.aggregate([
        {
          $group: {
            _id: "$category",
            products: { $sum: 1 },
            inventory: { $sum: "$stock" },
          },
        },
        { $sort: { products: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, category: "$_id", products: 1, inventory: 1 } },
      ]),
      OrderModel.find(orderFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "items totalAmount status paymentStatus createdAt shippingAddress",
        )
        .populate("user", "name email"),
    ]);

    res.status(200).json({
      success: true,
      filters: { days, lowStockThreshold },
      summary: {
        totalProducts,
        featuredProducts,
        lowStockProducts: lowStockProducts.length,
        totalOrders,
        paidRevenue: revenueResult[0]?.total || 0,
      },
      lowStockProducts,
      ordersByStatus: ordersByStatus.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      revenueByDay: revenueByDay.map((item) => ({
        date: item._id,
        revenue: item.revenue,
        orders: item.orders,
      })),
      topCategories,
      recentOrders,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch dashboard overview",
      error: (err as Error).message,
    });
  }
};
