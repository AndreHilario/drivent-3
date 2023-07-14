import supertest from 'supertest';
import httpStatus from 'http-status';
import faker from '@faker-js/faker';
import * as jwt from 'jsonwebtoken';
import { TicketStatus, User } from '@prisma/client';
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

const getToken = async (user: User) => {
  const token = await generateValidToken(user);
  return `Bearer ${token}`;
};

const createUserAndGenerateToken = async () => {
  const user = await createUser();
  const token = await getToken(user);
  return { user, token };
};

const testUnauthorizedRequest = async (route: string, token: string) => {
  const response = await server.get(route);
  expect(response.status).toBe(httpStatus.UNAUTHORIZED);
};

const testNotFoundRequest = async (route: string, token: string) => {
  const response = await server.get(route).set('Authorization', token);
  expect(response.status).toBe(httpStatus.NOT_FOUND);
};

const testBadRequest = async (route: string, token: string) => {
  const response = await server.get(route).set('Authorization', token);
  expect(response.status).toBe(httpStatus.BAD_REQUEST);
};

const testPaymentRequired = async (route: string, token: string) => {
  const response = await server.get(route).set('Authorization', token);
  expect(response.status).toBe(httpStatus.PAYMENT_REQUIRED);
};

const testSuccessResponse = async (route: string, token: string, expectedBody: any) => {
  const response = await server.get(route).set('Authorization', token);
  expect(response.status).toBe(httpStatus.OK);
  expect(response.body).toEqual(expectedBody);
};

describe('GET /hotels', () => {
  const baseUrl = '/hotels';

  it('should respond with status 401 if no token is given', async () => {
    await testUnauthorizedRequest(baseUrl, "");
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word();
    await testUnauthorizedRequest(`${baseUrl}/`, `Bearer ${token}`);
  });
  
  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    await testUnauthorizedRequest('/hotels', `Bearer ${token}`);
  });
  

  describe('when token is valid', () => {
    let user: User;
    let token: string;

    beforeEach(async () => {
      const result = await createUserAndGenerateToken();
      user = result.user;
      token = result.token;
    });

    it('should respond with status 404 when user doesnt have an enrollment yet', async () => {
      await testNotFoundRequest(baseUrl, token);
    });

    it('should respond with status 404 when user doesnt have a ticket yet', async () => {
      await createEnrollmentWithAddress(user);
      await testNotFoundRequest('/tickets', token);
    });

    it('should respond with status 404 when no hotels exist', async () => {
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await testNotFoundRequest(baseUrl, token);
    });

    it('should respond with status 402 when ticket status => "RESERVED"', async () => {
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketType();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
      await createHotels();
      await testPaymentRequired(baseUrl, token);
    });

    it('should respond with status 402 when ticket type is remote', async () => {
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createHotels();
      await testPaymentRequired(baseUrl, token);
    });

    it('should respond with status 402 when ticket type doesnt include hotel', async () => {
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithoutHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createHotels();
      await testPaymentRequired(baseUrl, token);
    });

    it('should respond with status 200 and with all hotels', async () => {
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const hotel = await createHotels();
      await testSuccessResponse(baseUrl, token, [{
        id: hotel.id,
        name: hotel.name,
        image: hotel.image,
        createdAt: hotel.createdAt.toISOString(),
        updatedAt: hotel.updatedAt.toISOString(),
      }]);
    });
  });
});

describe('GET /hotels/:hotelId', () => {
  const baseUrl = '/hotels';

  it('should respond with status 401 if no token is given', async () => {
    await testUnauthorizedRequest(`${baseUrl}/`, "");
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word();
    await testUnauthorizedRequest(`${baseUrl}/`, `Bearer ${token}`);
  });
  
  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    await testUnauthorizedRequest('/hotels', `Bearer ${token}`);
  });  

  describe('when token is valid', () => {
    let user: User;
    let token: string;

    beforeEach(async () => {
      const result = await createUserAndGenerateToken();
      user = result.user;
      token = result.token;
    });

    it('should respond with status 404 if hotelId parameter is not provided', async () => {
      await testNotFoundRequest(`${baseUrl}/`, token);
    });

    it('should respond with status 400 if hotelId parameter is different from number', async () => {
      await testBadRequest(`${baseUrl}/isString`, token);
    });

    describe('when hotelId parameter is valid', () => {
      it('should respond with status 404 when user doesnt have an enrollment yet', async () => {
        const hotel = await createHotels();
        await testNotFoundRequest(`${baseUrl}/${hotel.id}`, token);
      });

      it('should respond with status 404 when user doesnt have a ticket yet', async () => {
        await createEnrollmentWithAddress(user);
        const hotel = await createHotels();
        await testNotFoundRequest(`${baseUrl}/${hotel.id}`, token);
      });

      it('should respond with status 404 when hotelId doesnt exist', async () => {
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketType();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        await createHotels();
        await testNotFoundRequest(`${baseUrl}/999999`, token);
      });

      it('should respond with status 402 when ticket status => "RESERVED"', async () => {
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketType();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
        const hotel = await createHotels();
        await testPaymentRequired(`${baseUrl}/${hotel.id}`, token);
      });

      it('should respond with status 402 when ticket type is remote', async () => {
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeRemote();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotels();
        await testPaymentRequired(`${baseUrl}/${hotel.id}`, token);
      });

      it('should respond with status 402 when ticket type doesnt include hotel', async () => {
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithoutHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotels();
        await testPaymentRequired(`${baseUrl}/${hotel.id}`, token);
      });

      it('should respond with status 200 and with hotel by id', async () => {
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeHotel();
        await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const hotel = await createHotels();
        await testSuccessResponse(`${baseUrl}/${hotel.id}`, token, {
          id: hotel.id,
          name: hotel.name,
          image: hotel.image,
          createdAt: hotel.createdAt.toISOString(),
          updatedAt: hotel.updatedAt.toISOString(),
          Rooms: hotel.Rooms.length > 0 ? [
            {
              id: hotel.Rooms[0].id,
              name: hotel.Rooms[0].name,
              capacity: hotel.Rooms[0].capacity,
              hotelId: hotel.id,
              createdAt: hotel.Rooms[0].createdAt.toISOString(),
              updatedAt: hotel.Rooms[0].updatedAt.toISOString(),
            },
          ] : [],
        });
      });
    });
  });
});
