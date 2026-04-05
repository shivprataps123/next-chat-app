import jwt from "jsonwebtoken"
import prisma from "../../prisma/prisma.js"
import AppError from "../../utils/AppError.js"
import bcrypt from "bcrypt"

export const signupUser = async ({ email, password, name }) => {
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        throw new AppError("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name
        }
    })
    return user;
}

export const loginUser = async ({ email, password }) => {
    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user) {
        throw new AppError("Invalid email or password", 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new AppError("Invalid email or password", 400);
    }
    const token = jwt.sign({ userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
    return { token, user };
}