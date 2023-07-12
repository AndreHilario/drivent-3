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
    if (!result || result.length === 0 || result === null) throw notFoundError();

    const ticket = await ticketsRepository.findTicketByEnrollmentId(enrollment.id);
    if (
        ticket.status === TicketStatus.RESERVED ||
        ticket.TicketType.isRemote === true ||
        ticket.TicketType.includesHotel === false
    ) {
        throw paymentRequired();
    }
    if (!ticket) throw notFoundError();

    return result;
}

async function getHotelByIdWihtRooms(userId: number, hotelId: number) {

    const hotelWithRooms = await hotelsRepository.getHotelAndRoomsPrisma(hotelId);

    return {
        id: hotelWithRooms.id,
        name: hotelWithRooms.name,
        image: hotelWithRooms.image,
        createdAt: hotelWithRooms.createdAt.toISOString(),
        updatedAt: hotelWithRooms.updatedAt.toISOString(),
        Rooms: hotelWithRooms.Rooms.map(room => ({
            id: room.id,
            name: room.name,
            capacity: room.capacity,
            hotelId: room.hotelId,
            createdAt: room.createdAt.toISOString(),
            updatedAt: room.updatedAt.toISOString(),
        })),
    };
}

const hotelsService = {
    getHotels,
    getHotelByIdWihtRooms
};

export default hotelsService;
