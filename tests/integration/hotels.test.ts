import supertest from 'supertest';
import httpStatus from 'http-status';
import faker from '@faker-js/faker';
import * as jwt from 'jsonwebtoken';
import { TicketStatus } from '@prisma/client';
import { cleanDb, generateValidToken } from '../helpers';
import {
    createEnrollmentWithAddress,
    createUser,
    createTicketType,
    createTicket,
    createHotels,
    createTicketTypeWithoutHotel,
    createTicketTypeRemote,
    createTicketTypeHotel,
} from '../factories';
import app, { init } from '@/app';

beforeAll(async () => {
    await init();
});

beforeEach(async () => {
    await cleanDb();
});

const server = supertest(app);

describe('GET /hotels', () => {
    it('should respond with status 401 if no token is given', async () => {
        const response = await server.get('/hotels');

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('should respond with status 401 if given token is not valid', async () => {
        const token = faker.lorem.word();

        const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('should respond with status 401 if there is no session for given token', async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

        const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    describe('when token is valid', () => {
        it('should respond with status 404 when user doesnt have an enrollment yet', async () => {
            const token = await generateValidToken();

            const response = await server.get('/hotels').set('Authorization', `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        });

        it('should respond with status 404 when user doesnt have a ticket yet', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            await createEnrollmentWithAddress(user);

            const response = await server.get('/tickets').set('Authorization', `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        });

        it('should respond with status 404 when no hotels exist ', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketType();
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

            const response = await server.get(`/hotels`).set('Authorization', `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        });

        it('should respond with status 402 when ticket status => "RESERVED"', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketType();
            await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
            await createHotels();

            const response = await server.get(`/hotels`).set('Authorization', `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        });

        it('should respond with status 402 when ticket type is remote', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeRemote();
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
            await createHotels();

            const response = await server.get(`/hotels`).set('Authorization', `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        });

        it('should respond with status 402 when ticket type doesnt includes hotel', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithoutHotel();
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
            await createHotels();

            const response = await server.get(`/hotels`).set('Authorization', `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        });

        it('should respond with status 200 and with all hotels', async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeHotel();
            await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
            const hotel = await createHotels();

            const response = await server.get(`/hotels`).set('Authorization', `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.OK);
            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: hotel.id,
                        name: hotel.name,
                        image: hotel.image,
                        createdAt: hotel.createdAt.toISOString(),
                        updatedAt: hotel.updatedAt.toISOString(),
                    }),
                ]),
            );
        });
    });
});

describe('GET /hotels/:hotelId', () => {
    it('should respond with status 401 if no token is given', async () => {
        const response = await server.get(`/hotels/`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('should respond with status 401 if given token is not valid', async () => {
        const token = faker.lorem.word();

        const response = await server.get(`/hotels/`).set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it('should respond with status 401 if there is no session for given token', async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

        const response = await server.get(`/hotels/`).set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    describe('when token is valid', () => {
        it('should respond with status 400 if hotelId parameter is not provided', async () => {
            const response = await server.get('/hotels');

            expect(response.status).toBe(httpStatus.BAD_REQUEST);
        });

        it('should respond with status 400 if hotelId parameter is different from number', async () => {
            const response = await server.get('/hotels/isString');

            expect(response.status).toBe(httpStatus.BAD_REQUEST);
        });

        describe('when hotelId parameter is valid', () => {

            it('should respond with status 404 when user doesnt have an enrollment yet', async () => {
                const token = await generateValidToken();
                const hotel = await createHotels();

                const response = await server.get(`/hotels/${hotel.id}`).set('Authorization', `Bearer ${token}`);

                expect(response.status).toEqual(httpStatus.NOT_FOUND);
            });

            it('should respond with status 404 when user doesnt have a ticket yet', async () => {
                const user = await createUser();
                const token = await generateValidToken(user);
                await createEnrollmentWithAddress(user);
                const hotel = await createHotels();

                const response = await server.get(`/hotels/${hotel.id}`).set('Authorization', `Bearer ${token}`);

                expect(response.status).toEqual(httpStatus.NOT_FOUND);
            });

            it('should respond with status 404 when hotelId doesnt exist ', async () => {
                const user = await createUser();
                const token = await generateValidToken(user);
                const enrollment = await createEnrollmentWithAddress(user);
                const ticketType = await createTicketType();
                await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
                await createHotels();

                const response = await server.get(`/hotels/000000`).set('Authorization', `Bearer ${token}`);

                expect(response.status).toEqual(httpStatus.NOT_FOUND);
            });

            it('should respond with status 402 when ticket status => "RESERVED"', async () => {
                const user = await createUser();
                const token = await generateValidToken(user);
                const enrollment = await createEnrollmentWithAddress(user);
                const ticketType = await createTicketType();
                await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
                const hotel = await createHotels();

                const response = await server.get(`/hotels/${hotel.id}`).set('Authorization', `Bearer ${token}`);

                expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
            });

            it('should respond with status 402 when ticket type is remote', async () => {
                const user = await createUser();
                const token = await generateValidToken(user);
                const enrollment = await createEnrollmentWithAddress(user);
                const ticketType = await createTicketTypeRemote();
                await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
                const hotel = await createHotels();

                const response = await server.get(`/hotels/${hotel.id}`).set('Authorization', `Bearer ${token}`);

                expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
            });

            it('should respond with status 402 when ticket type doesnt includes hotel', async () => {
                const user = await createUser();
                const token = await generateValidToken(user);
                const enrollment = await createEnrollmentWithAddress(user);
                const ticketType = await createTicketTypeWithoutHotel();
                await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
                const hotel = await createHotels();

                const response = await server.get(`/hotels/${hotel.id}`).set('Authorization', `Bearer ${token}`);

                expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
            });

            it('should respond with status 200 and with hotel by id', async () => {
                const user = await createUser();
                const token = await generateValidToken(user);
                const enrollment = await createEnrollmentWithAddress(user);
                const ticketType = await createTicketTypeHotel();
                await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
                const hotel = await createHotels();

                const response = await server.get(`/hotels/${hotel.id}`).set('Authorization', `Bearer ${token}`);

                expect(response.status).toEqual(httpStatus.OK);
                expect(response.body).toEqual(
                    expect.objectContaining({
                        id: hotel.id,
                        name: hotel.name,
                        image: hotel.image,
                        createdAt: hotel.createdAt.toISOString(),
                        updatedAt: hotel.updatedAt.toISOString(),
                        Rooms: [{
                            id: hotel.Rooms[0].id,
                            name: hotel.Rooms[0].name,
                            capacity: hotel.Rooms[0].capacity,
                            hotelId: hotel.id,
                            createdAt: hotel.Rooms[0].createdAt.toISOString(),
                            updatedAt: hotel.Rooms[0].updatedAt.toISOString()
                        }]
                    }),

                );
            });
        });
    });
});
