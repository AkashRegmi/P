import "dotenv/config";
import express from "express";
import productRoutes from "./routes/productRoutes";
import { connectDB } from "./config/db";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running 🚀",
  });
});

app.use("/api/products", productRoutes);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start();

export default app;
