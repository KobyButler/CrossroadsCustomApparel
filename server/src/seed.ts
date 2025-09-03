import { prisma } from './prisma.js';

async function main() {
    const col = await prisma.collection.upsert({
        where: { slug: 'booster-club' },
        update: {},
        create: { name: 'Booster Club', slug: 'booster-club', description: 'Team merch' }
    });

    await prisma.product.upsert({
        where: { sku: 'K420' },
        update: {},
        create: {
            name: 'Polo K420',
            sku: 'K420',
            vendor: 'SANMAR',
            vendorIdentifier: '9203', // inventoryKey example from doc
            brand: 'Port Authority',
            description: 'Pique Knit Polo',
            priceCents: 1999,
            imagesJson: JSON.stringify([]),
            collectionId: col.id
        }
    });

    await prisma.product.upsert({
        where: { sku: 'B22060655' },
        update: {},
        create: {
            name: 'Gildan 18500 Hoodie (Navy L)',
            sku: 'B22060655',
            vendor: 'SSACTIVEWEAR',
            vendorIdentifier: 'B00760003', // example identifier
            brand: 'Gildan',
            description: 'Heavy Blend Hoodie',
            priceCents: 2899,
            imagesJson: JSON.stringify([]),
            collectionId: col.id
        }
    });

    await prisma.shop.upsert({
        where: { slug: 'panthers-boosters-1234' },
        update: {},
        create: { name: 'Panthers Boosters', slug: 'panthers-boosters-1234', collectionId: col.id }
    });

    await prisma.discountCode.upsert({
        where: { code: 'TEAM10' },
        update: {},
        create: { code: 'TEAM10', type: 'PERCENT', value: 10 }
    });

    console.log('seed done');
}

main().finally(() => prisma.$disconnect());
