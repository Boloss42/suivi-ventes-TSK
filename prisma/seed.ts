import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { startOfWeek, subWeeks } from "date-fns";

const prisma = new PrismaClient();

const STAFF_PASSWORD = "Staff1234!";
const CLIENT_PASSWORD = "Client1234!";

function weeksAgo(n: number) {
  return startOfWeek(subWeeks(new Date(), n), { weekStartsOn: 1 });
}

const SUPER_ADMIN_PASSWORD = "Admin1234!";

async function main() {
  // Nettoyage (ordre respectant les contraintes de clé étrangère).
  await prisma.notification.deleteMany();
  await prisma.priceProposal.deleteMany();
  await prisma.weeklyStat.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.listingUrl.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();

  const adminPasswordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  await prisma.user.create({
    data: {
      email: "admin@transakauto.fr",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });

  const agency = await prisma.agency.create({
    data: { name: "Agence Démo", maxStaffAccounts: 5 },
  });

  const staffPasswordHash = await bcrypt.hash(STAFF_PASSWORD, 10);
  const staffUser = await prisma.user.create({
    data: {
      email: "staff@transakauto.fr",
      passwordHash: staffPasswordHash,
      role: "STAFF",
      agencyId: agency.id,
      phone: "06 00 00 00 00",
    },
  });

  const clientPasswordHash = await bcrypt.hash(CLIENT_PASSWORD, 10);

  const martin = await prisma.client.create({
    data: {
      agency: { connect: { id: agency.id } },
      assignedStaff: { connect: { id: staffUser.id } },
      firstName: "Martin",
      lastName: "Dupont",
      phone: "06 12 34 56 78",
      user: {
        create: {
          email: "martin.dupont@example.com",
          passwordHash: clientPasswordHash,
          role: "CLIENT" as const,
        },
      },
    },
  });

  const sophie = await prisma.client.create({
    data: {
      agency: { connect: { id: agency.id } },
      assignedStaff: { connect: { id: staffUser.id } },
      firstName: "Sophie",
      lastName: "Bernard",
      phone: "06 98 76 54 32",
      user: {
        create: {
          email: "sophie.bernard@example.com",
          passwordHash: clientPasswordHash,
          role: "CLIENT" as const,
        },
      },
    },
  });

  const ahmed = await prisma.client.create({
    data: {
      agency: { connect: { id: agency.id } },
      assignedStaff: { connect: { id: staffUser.id } },
      firstName: "Ahmed",
      lastName: "Khalil",
      phone: "07 11 22 33 44",
      user: {
        create: {
          email: "ahmed.khalil@example.com",
          passwordHash: clientPasswordHash,
          role: "CLIENT" as const,
        },
      },
    },
  });

  const peugeot308 = await prisma.vehicle.create({
    data: {
      agencyId: agency.id,
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
      agencyId: agency.id,
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
      agencyId: agency.id,
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
      agencyId: agency.id,
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
      agencyId: agency.id,
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
    // Les relevés sont des TOTAUX CUMULÉS (snapshots) : chaque valeur est le
    // total depuis la mise en vente à cette date, pas l'activité de la semaine.
    // Les séries sont donc croissantes ; le gain d'une semaine = valeur − valeur
    // du relevé précédent.

    // Peugeot 308 (6 semaines)
    { vehicleId: peugeot308.id, weeksBack: 5, views: 45, contacts: 2, calls: 1, favorites: 3, visits: 0, offers: 0 },
    { vehicleId: peugeot308.id, weeksBack: 4, views: 123, contacts: 6, calls: 3, favorites: 9, visits: 1, offers: 0 },
    { vehicleId: peugeot308.id, weeksBack: 3, views: 235, contacts: 12, calls: 6, favorites: 18, visits: 3, offers: 1 },
    { vehicleId: peugeot308.id, weeksBack: 2, views: 330, contacts: 17, calls: 8, favorites: 26, visits: 4, offers: 1, note: "Ralentissement des visites, prix peut-être à ajuster." },
    { vehicleId: peugeot308.id, weeksBack: 1, views: 460, contacts: 24, calls: 12, favorites: 37, visits: 7, offers: 2 },
    { vehicleId: peugeot308.id, weeksBack: 0, views: 520, contacts: 27, calls: 13, favorites: 41, visits: 8, offers: 2 },

    // Renault Clio (3 semaines)
    { vehicleId: clio.id, weeksBack: 3, views: 60, contacts: 3, calls: 1, favorites: 5, visits: 1, offers: 0 },
    { vehicleId: clio.id, weeksBack: 2, views: 145, contacts: 8, calls: 3, favorites: 12, visits: 3, offers: 0 },
    { vehicleId: clio.id, weeksBack: 1, views: 246, contacts: 14, calls: 6, favorites: 22, visits: 5, offers: 1 },
    // Pas de relevé pour la semaine en cours : illustre l'alerte du tableau de bord staff.

    // BMW Série 3 (vendue — historique complet jusqu'à la vente)
    { vehicleId: serie3.id, weeksBack: 6, views: 90, contacts: 5, calls: 2, favorites: 8, visits: 1, offers: 0 },
    { vehicleId: serie3.id, weeksBack: 5, views: 230, contacts: 14, calls: 6, favorites: 22, visits: 4, offers: 1 },
    { vehicleId: serie3.id, weeksBack: 4, views: 405, contacts: 26, calls: 12, favorites: 40, visits: 9, offers: 3 },
    { vehicleId: serie3.id, weeksBack: 3, views: 565, contacts: 36, calls: 17, favorites: 56, visits: 13, offers: 5, note: "Plusieurs offres reçues, négociation en cours." },
    { vehicleId: serie3.id, weeksBack: 2, views: 685, contacts: 43, calls: 20, favorites: 68, visits: 15, offers: 8, note: "Vente finalisée en fin de semaine." },

    // Audi A4 (2 semaines)
    { vehicleId: a4.id, weeksBack: 2, views: 50, contacts: 2, calls: 1, favorites: 4, visits: 0, offers: 0 },
    { vehicleId: a4.id, weeksBack: 1, views: 138, contacts: 6, calls: 3, favorites: 11, visits: 1, offers: 0 },
    // Pas de relevé pour la semaine en cours : illustre l'alerte du tableau de bord staff.

    // Citroën C3 (retirée — historique figé)
    { vehicleId: c3.id, weeksBack: 8, views: 30, contacts: 1, calls: 0, favorites: 2, visits: 0, offers: 0 },
    { vehicleId: c3.id, weeksBack: 7, views: 55, contacts: 2, calls: 0, favorites: 3, visits: 0, offers: 0, note: "Peu d'intérêt, véhicule retiré de la vente." },
  ];

  for (const s of weeklyStatsData) {
    await prisma.weeklyStat.create({
      data: {
        vehicleId: s.vehicleId,
        weekStart: weeksAgo(s.weeksBack),
        views: s.views,
        // « Vues » (ouvertures réelles) : une fraction des apparitions, pour un
        // jeu de démo réaliste. Reste cumulé et croissant comme les apparitions.
        detailViews: Math.round(s.views * 0.55),
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
  console.log("Compte super-admin : admin@transakauto.fr / " + SUPER_ADMIN_PASSWORD);
  console.log("Compte staff       : staff@transakauto.fr / " + STAFF_PASSWORD);
  console.log("Comptes client     : martin.dupont@example.com / " + CLIENT_PASSWORD);
  console.log("                     sophie.bernard@example.com / " + CLIENT_PASSWORD);
  console.log("                     ahmed.khalil@example.com / " + CLIENT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
