import { getAllHotels } from "@/controllers/hotels-controller";
import { authenticateToken } from "@/middlewares";
import { Router } from "express";

const hotelsRouter = Router();

hotelsRouter
    .all('/*', authenticateToken)
    .get('/', getAllHotels)
    .get('/:hotelId');

export { hotelsRouter };