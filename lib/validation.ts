import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const staffAccountSchema = z.object({
  email: z.string().email("Adresse email invalide"),
});

export const staffProfileSchema = z.object({
  firstName: z.string().optional(),
  phone: z.string().optional(),
});

export const agencySchema = z.object({
  name: z.string().min(1, "Nom de l'agence requis"),
  maxStaffAccounts: z.coerce.number().int().min(1, "Le quota doit être d'au moins 1"),
});

export const clientSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().optional(),
});

export const vehicleStatusValues = ["EN_VENTE", "VENDU", "RETIRE"] as const;

export const listingUrlSchema = z.object({
  label: z.string().min(1, "Nom de la plateforme requis"),
  url: z.string().url("Lien invalide"),
});

export const vehicleSchema = z.object({
  // Requis uniquement lorsqu'un client existant est sélectionné (voir
  // clientMode dans lib/actions/vehicles.ts) : la création d'un nouveau
  // client se valide séparément avec clientSchema.
  clientId: z.string().optional(),
  make: z.string().min(1, "Marque requise"),
  model: z.string().min(1, "Modèle requis"),
  year: z.coerce.number().int().min(1900).max(2100),
  mileage: z.coerce.number().int().min(0),
  fuelType: z.string().min(1, "Motorisation requise"),
  reference: z.string().min(1, "Immatriculation / référence requise"),
  price: z.coerce.number().int().min(0),
  advisedPrice: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  status: z.enum(vehicleStatusValues),
  depositDate: z.string().min(1, "Date de mise en dépôt requise"),
  listingUrls: z.array(listingUrlSchema).optional().default([]),
});

// Une ligne du formulaire d'ajout en masse. Contrairement au formulaire unitaire,
// le client est ici toujours choisi par ligne (pas de création de client inline)
// et il n'y a ni photos ni liens d'annonce (ajoutés ensuite par véhicule).
export const bulkVehicleRowSchema = z.object({
  clientId: z.string().min(1, "Client requis"),
  make: z.string().min(1, "Marque requise"),
  model: z.string().min(1, "Modèle requis"),
  year: z.coerce.number().int().min(1900).max(2100),
  mileage: z.coerce.number().int().min(0),
  fuelType: z.string().min(1, "Motorisation requise"),
  reference: z.string().min(1, "Immatriculation / référence requise"),
  price: z.coerce.number().int().min(0),
  advisedPrice: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  status: z.enum(vehicleStatusValues).default("EN_VENTE"),
  depositDate: z.string().min(1, "Date de mise en dépôt requise"),
});

export const bulkVehiclesSchema = z
  .array(bulkVehicleRowSchema)
  .min(1, "Ajoutez au moins un véhicule")
  .max(50, "50 véhicules maximum par lot");

export const activateSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export const priceProposalSchema = z.object({
  vehicleId: z.string().min(1),
  proposedPrice: z.coerce.number().int().min(1, "Prix invalide"),
  message: z.string().optional(),
});

export const weeklyStatSchema = z.object({
  vehicleId: z.string().min(1),
  weekStart: z.string().min(1, "Semaine requise"),
  views: z.coerce.number().int().min(0).default(0),
  contacts: z.coerce.number().int().min(0).default(0),
  calls: z.coerce.number().int().min(0).default(0),
  favorites: z.coerce.number().int().min(0).default(0),
  visits: z.coerce.number().int().min(0).default(0),
  offers: z.coerce.number().int().min(0).default(0),
  note: z.string().optional(),
});
