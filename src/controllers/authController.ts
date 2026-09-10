import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/User";
import { AuthRequest } from "../middleware/authMiddleware";

const generateToken = (user: { id: string; email: string; name: string }) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: "15m" },
  );
  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: "7d" },
  );
  return { accessToken, refreshToken };
};

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        message: "name, email and password are required",
      });
      return;
    }

    const existingUser = await UserModel.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      res.status(409).json({ message: "User already exists with this email" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to register user",
      error: (err as Error).message,
    });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        message: "email and password are required",
      });
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to login",
      error: (err as Error).message,
    });
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const user = await UserModel.findById(req.user?.id).select("-password");

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch current user",
      error: (err as Error).message,
    });
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        message: "Refresh token is required",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      res.status(500).json({
        message: "JWT_SECRET is not configured",
      });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, secret) as {
      id: string;
      email: string;
      name: string;
    };

    // Optional but recommended: check if user still exists
    const user = await UserModel.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({
        message: "User no longer exists",
      });
      return;
    }

    // Generate only a new access token
    const accessToken = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      secret,
      {
        expiresIn: "15m",
      },
    );

    res.status(200).json({
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        message: "Refresh token has expired. Please login again.",
      });
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        message: "Invalid refresh token",
      });
      return;
    }

    res.status(500).json({
      message: "Failed to refresh access token",
      error: (err as Error).message,
    });
  }
};