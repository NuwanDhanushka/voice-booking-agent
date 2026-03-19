import 'dotenv/config';
import { PrismaClient } from '../apps/api/src/generated/prisma/client/client';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    await prisma.resourceBusinessHour.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.service.deleteMany();

    const service = await prisma.service.create({
        data: {
            name: 'Study Room',
            slug: 'study_room',
            defaultDurationMinutes: 60,
            minDurationMinutes: 30,
            maxDurationMinutes: 120,
            slotIntervalMinutes: 30,
            active: true,
        },
    });

    const resources = await Promise.all([
        prisma.resource.create({
            data: {
                serviceId: service.id,
                name: 'Room A',
                capacity: 4,
                location: 'First Floor',
                active: true,
            },
        }),
        prisma.resource.create({
            data: {
                serviceId: service.id,
                name: 'Room B',
                capacity: 6,
                location: 'First Floor',
                active: true,
            },
        }),
        prisma.resource.create({
            data: {
                serviceId: service.id,
                name: 'Room C',
                capacity: 2,
                location: 'Second Floor',
                active: true,
            },
        }),
    ]);

    for (const resource of resources) {
        await prisma.resourceBusinessHour.createMany({
            data: [
                { resourceId: resource.id, dayOfWeek: 1, openTime: '08:00', closeTime: '20:00', isActive: true },
                { resourceId: resource.id, dayOfWeek: 2, openTime: '08:00', closeTime: '20:00', isActive: true },
                { resourceId: resource.id, dayOfWeek: 3, openTime: '08:00', closeTime: '20:00', isActive: true },
                { resourceId: resource.id, dayOfWeek: 4, openTime: '08:00', closeTime: '20:00', isActive: true },
                { resourceId: resource.id, dayOfWeek: 5, openTime: '08:00', closeTime: '20:00', isActive: true },
            ],
        });
    }

    console.log('Seed complete');
}

main()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });