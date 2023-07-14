import { Hotel } from '@prisma/client';
import { prisma } from '@/config';

async function getAllHotelsPrisma(): Promise<Hotel[] | null> {
  return prisma.hotel.findMany();
}

async function getHotelAndRoomsPrisma(hotelId: number) {
  return prisma.hotel.findFirst({
    where: {
      id: hotelId,
    },
    include: {
      Rooms: true,
    },
  });
}

const hotelsRepository = {
  getAllHotelsPrisma,
  getHotelAndRoomsPrisma,
};

export default hotelsRepository;
