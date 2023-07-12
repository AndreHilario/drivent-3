import { Hotel } from '@prisma/client';
import { prisma } from '@/config';

async function getAllHotelsPrisma(): Promise<Hotel[] | null> {
  return prisma.hotel.findMany();
}
const hotelsRepository = {
  getAllHotelsPrisma,
};

export default hotelsRepository;
