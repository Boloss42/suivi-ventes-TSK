import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { startOfWeek, subWeeks } from "date-fns";

const prisma = new PrismaClient();

const STAFF_PASSWORD = "Staff1234!";
const CLIENT_PASSWORD = "Client1234!";

function weeksAgo(n: number) {
  return startOfWeek(subWeeks(new Date(), n), { weekStartsOn: 1 });
}

async function main() {
  // Nettoyage (ordre respectant les contraintes de clé étrangère).
  await prisma.weeklyStat.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.listingUrl.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const staffPasswordHash = await bcrypt.hash(STAFF_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: "staff@transakauto.fr",
      passwordHash: staffPasswordHash,
      role: "STAFF",
    },
  });

  const clientPasswordHash = await bcrypt.hash(CLIENT_PASSWORD, 10);

  const martin = await prisma.client.create({
    data: {
      firstName: "Martin",
      lastName: "Dupont",
      phone: "06 12 34 56 78",
      user: {
        create: {
          email: "martin.dupont@example.com",
          passwordHash: clientPasswordHash,
          role: "CLIENT",
        },
      },
    },
  });

  const sophie = await prisma.client.create({
    data: {
      firstName: "Sophie",
      lastName: "Bernard",
      phone: "06 98 76 54 32",
      user: {
        create: {
          email: "sophie.bernard@example.com",
          passwordHash: clientPasswordHash,
          role: "CLIENT",
        },
      },
    },
  });

  const ahmed = await prisma.client.create({
    data: {
      firstName: "Ahmed",
      lastName: "Khalil",
      phone: "07 11 22 33 44",
      user: {
        create: {
          email: "ahmed.khalil@example.com",
          passwordHash: clientPasswordHash,
          role: "CLIENT",
        },
      },
    },
  });

  const peugeot308 = await prisma.vehicle.create({
    data: {
      clientId: martin.id,
      make: "Peugeot",
      model: "308",
      year: 2019,
      mileage: 62000,
      fuelType: "Diesel",
      reference: "AB-123-CD",
      price: 13900,
      status: "EN_VENTE",
      depositDate: weeksAgo(6),
      listingUrls: {
        create: [
          { label: "LeBonCoin", url: "https://www.leboncoin.fr/annonce/exemple-308" },
          { label: "La Centrale", url: "https://www.lacentrale.fr/annonce/exemple-308" },
        ],
      },
    },
  });

  const clio = await prisma.vehicle.create({
    data: {
      clientId: martin.id,
      make: "Renault",
      model: "Clio",
      year: 2020,
      mileage: 41000,
      fuelType: "Essence",
      reference: "EF-456-GH",
      price: 12500,
      status: "EN_VENTE",
      depositDate: weeksAgo(4),
      listingUrls: {
        create: [{ label: "LeBonCoin", url: "https://www.leboncoin.fr/annonce/exemple-clio" }],
      },
    },
  });

  const serie3 = await prisma.vehicle.create({
    data: {
      clientId: sophie.id,
      make: "BMW",
      model: "Série 3",
      year: 2018,
      mileage: 88000,
      fuelType: "Diesel",
      reference: "IJ-789-KL",
      price: 19900,
      status: "VENDU",
      depositDate: weeksAgo(10),
      listingUrls: {
        create: [{ label: "AutoScout24", url: "https://www.autoscout24.fr/annonce/exemple-serie3" }],
      },
    },
  });

  const a4 = await prisma.vehicle.create({
    data: {
      clientId: ahmed.id,
      make: "Audi",
      model: "A4",
      year: 2021,
      mileage: 28000,
      fuelType: "Hybride",
      reference: "MN-012-OP",
      price: 27900,
      status: "EN_VENTE",
      depositDate: weeksAgo(3),
      listingUrls: {
        create: [
          { label: "La Centrale", url: "https://www.lacentrale.fr/annonce/exemple-a4" },
          { label: "AutoScout24", url: "https://www.autoscout24.fr/annonce/exemple-a4" },
        ],
      },
    },
  });

  const c3 = await prisma.vehicle.create({
    data: {
      clientId: ahmed.id,
      make: "Citroën",
      model: "C3",
      year: 2017,
      mileage: 95000,
      fuelType: "Essence",
      reference: "QR-345-ST",
      price: 8900,
      status: "RETIRE",
      depositDate: weeksAgo(14),
    },
  });

  // Relevés hebdomadaires — tendance de vues croissante puis stabilisée,
  // avec quelques contacts/appels/visites cohérents.
  const weeklyStatsData: {
    vehicleId: string;
    weeksBack: number;
    views: number;
    contacts: number;
    calls: number;
    favorites: number;
    visits: number;
    offers: number;
    note?: string;
  }[] = [
    // Peugeot 308 (5 semaines)
    { vehicleId: peugeot308.id, weeksBack: 5, views: 45, contacts: 2, calls: 1, favorites: 3, visits: 0, offers: 0 },
    { vehicleId: peugeot308.id, weeksBack: 4, views: 78, contacts: 4, calls: 2, favorites: 6, visits: 1, offers: 0 },
    { vehicleId: peugeot308.id, weeksBack: 3, views: 112, contacts: 6, calls: 3, favorites: 9, visits: 2, offers: 1 },
    { vehicleId: peugeot308.id, weeksBack: 2, views: 95, contacts: 5, calls: 2, favorites: 8, visits: 1, offers: 0, note: "Baisse légère, prix peut-être à ajuster." },
    { vehicleId: peugeot308.id, weeksBack: 1, views: 130, contacts: 7, calls: 4, favorites: 11, visits: 3, offers: 1 },
    { vehicleId: peugeot308.id, weeksBack: 0, views: 60, contacts: 3, calls: 1, favorites: 4, visits: 1, offers: 0 },

    // Renault Clio (4 semaines)
    { vehicleId: clio.id, weeksBack: 3, views: 60, contacts: 3, calls: 1, favorites: 5, visits: 1, offers: 0 },
    { vehicleId: clio.id, weeksBack: 2, views: 85, contacts: 5, calls: 2, favorites: 7, visits: 2, offers: 0 },
    { vehicleId: clio.id, weeksBack: 1, views: 101, contacts: 6, calls: 3, favorites: 10, visits: 2, offers: 1 },
    // Pas de relevé pour la semaine en cours : illustre l'alerte du tableau de bord staff.

    // BMW Série 3 (vendue — historique complet jusqu'à la vente)
    { vehicleId: serie3.id, weeksBack: 6, views: 90, contacts: 5, calls: 2, favorites: 8, visits: 1, offers: 0 },
    { vehicleId: serie3.id, weeksBack: 5, views: 140, contacts: 9, calls: 4, favorites: 14, visits: 3, offers: 1 },
    { vehicleId: serie3.id, weeksBack: 4, views: 175, contacts: 12, calls: 6, favorites: 18, visits: 5, offers: 2 },
    { vehicleId: serie3.id, weeksBack: 3, views: 160, contacts: 10, calls: 5, favorites: 16, visits: 4, offers: 2, note: "Plusieurs offres reçues, négociation en cours." },
    { vehicleId: serie3.id, weeksBack: 2, views: 120, contacts: 7, calls: 3, favorites: 12, visits: 2, offers: 3, note: "Vente finalisée en fin de semaine." },

    // Audi A4 (3 semaines)
    { vehicleId: a4.id, weeksBack: 2, views: 50, contacts: 2, calls: 1, favorites: 4, visits: 0, offers: 0 },
    { vehicleId: a4.id, weeksBack: 1, views: 88, contacts: 4, calls: 2, favorites: 7, visits: 1, offers: 0 },
    // Pas de relevé pour la semaine en cours : illustre l'alerte du tableau de bord staff.

    // Citroën C3 (retirée — historique figé)
    { vehicleId: c3.id, weeksBack: 8, views: 30, contacts: 1, calls: 0, favorites: 2, visits: 0, offers: 0 },
    { vehicleId: c3.id, weeksBack: 7, views: 25, contacts: 1, calls: 0, favorites: 1, visits: 0, offers: 0, note: "Peu d'intérêt, véhicule retiré de la vente." },
  ];

  for (const s of weeklyStatsData) {
    await prisma.weeklyStat.create({
      data: {
        vehicleId: s.vehicleId,
        weekStart: weeksAgo(s.weeksBack),
        views: s.views,
        contacts: s.contacts,
        calls: s.calls,
        favorites: s.favorites,
        visits: s.visits,
        offers: s.offers,
        note: s.note,
      },
    });
  }

  console.log("Jeu de données de démonstration créé avec succès.");
  console.log("");
  console.log("Compte staff  : staff@transakauto.fr / " + STAFF_PASSWORD);
  console.log("Comptes client: martin.dupont@example.com / " + CLIENT_PASSWORD);
  console.log("                sophie.bernard@example.com / " + CLIENT_PASSWORD);
  console.log("                ahmed.khalil@example.com / " + CLIENT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
