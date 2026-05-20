import { body, param, query, validationResult } from "express-validator";

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const validateRegistration = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("name")
    .isString()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  validateRequest,
];

export const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  validateRequest,
];

export const validateRoomMessage = [
  body("roomId").isString().notEmpty().withMessage("Room id is required"),
  body("content")
    .isString()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message content must be 1-5000 characters"),
  validateRequest,
];

export const validateMessageUpdate = [
  body("content")
    .isString()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message content must be 1-5000 characters"),
  validateRequest,
];

export const validateRoomId = [
  param("roomId").isString().notEmpty().withMessage("Room id is required"),
  validateRequest,
];

export const validateMessageId = [
  param("messageId").isMongoId().withMessage("Message id must be valid"),
  validateRequest,
];

export const validateUserProfile = [
  body("name")
    .optional()
    .isString()
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),
  body("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
  validateRequest,
];
