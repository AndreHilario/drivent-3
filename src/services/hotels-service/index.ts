import { TicketStatus } from '@prisma/client';
import { notFoundError } from '@/errors';
import { paymentRequired } from '@/errors/payment-required-error';
import enrollmentRepository from '@/repositories/enrollment-repository';
import hotelsRepository from '@/repositories/hotels-repository';
import ticketsRepository from '@/repositories/tickets-repository';

async function getHotels(userId: number) {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  if (!enrollment) throw notFoundError();

  const result = await hotelsRepository.getAllHotelsPrisma();
  console.log(result);
  if (!result || result.length === 0 || result === null) throw notFoundError();

  const ticket = await ticketsRepository.findTicketByEnrollmentId(enrollment.id);
  if (!ticket) throw notFoundError();

  if (
    ticket.status === TicketStatus.RESERVED ||
    ticket.TicketType.isRemote === true ||
    ticket.TicketType.includesHotel === false
  ) {
    throw paymentRequired();
  }

  return result;
}

const hotelsService = {
  getHotels,
};

export default hotelsService;
