import { prisma } from "@/config";
import { Hotel } from "@prisma/client";

async function getAllHotelsPrisma(): Promise<Hotel[] | null> {
    return prisma.hotel.findMany();
}
const hotelsRepository = {
    getAllHotelsPrisma
}

export default hotelsRepository;