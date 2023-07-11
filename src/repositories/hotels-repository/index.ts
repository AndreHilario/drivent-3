import { prisma } from "@/config";

async function getAllHotelsPrisma() {
    return prisma.hotel.findMany();
}

const hotelsRepository = {
    getAllHotelsPrisma
}

export default hotelsRepository;