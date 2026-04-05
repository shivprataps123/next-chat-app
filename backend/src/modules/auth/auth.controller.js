import { loginUser, signupUser } from "./auth.service.js"

export const signup = async (req, res, next) => {
    try {
        const user = await signupUser(req.body);

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user
        })
    } catch (err) {
        next(err);
    }
}

export const login = async (req, res, next) => {
    try {
        const { token, user: { password, ...rest } } = await loginUser(req.body);

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            data: { rest, token }
        });
    } catch (err) {
        next(err);
    }
};