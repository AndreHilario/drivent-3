import { prisma } from "@/config";
import faker from "@faker-js/faker";

export function createHotels() {
    return prisma.hotel.create({
        data: {
            name: faker.name.findName(),
            image: faker.image.imageUrl(),
            createdAt: faker.date.recent(),
            updatedAt: faker.date.future(),
        },
    });
}