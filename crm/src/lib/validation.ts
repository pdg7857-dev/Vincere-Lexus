// Zod schemas. Actions pre-coerce numbers/booleans/arrays via lib/forms helpers,
// then validate the resulting object here. Dates are coerced by Zod.
import { z } from "zod";
import {
  CUSTOMER_TYPES,
  CUSTOMER_STATUSES,
  PAYMENT_METHODS,
  CONDITIONS,
  VEHICLE_STATUSES,
  VEHICLE_SOURCES,
  ACTIVITY_TYPES,
} from "@/lib/constants";

const text = z.string().trim().min(1);

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  totp: z.string().trim().optional(),
});

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  businessName: text.optional(),
  type: z.enum(CUSTOMER_TYPES),
  phone: text.optional(),
  email: z.string().trim().email("Enter a valid email").optional(),
  preferredChannel: text.optional(),
  language: text.optional(),
  leadSourceId: text.optional(),
  status: z.enum(CUSTOMER_STATUSES),
  tags: z.array(z.string()).default([]),
  whatTheyDoWithCars: text.optional(),
  exportDestination: text.optional(),
  typicalVolume: text.optional(),
  buyingCadence: text.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  consentToContact: z.boolean().default(false),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const wantSchema = z.object({
  make: text.optional(),
  model: text.optional(),
  trim: text.optional(),
  yearMin: z.number().int().optional(),
  yearMax: z.number().int().optional(),
  body: text.optional(),
  drivetrain: text.optional(),
  colorExterior: z.array(z.string()).default([]),
  colorInterior: z.array(z.string()).default([]),
  mileageMax: z.number().int().nonnegative().optional(),
  condition: z.enum(CONDITIONS),
  priceMax: z.number().nonnegative().optional(),
  currency: z.string().trim().default("CAD"),
  optionsRequired: z.array(z.string()).default([]),
  optionsNiceToHave: z.array(z.string()).default([]),
  quantity: z.number().int().positive().default(1),
  recurring: z.boolean().default(false),
  priority: z.number().int().default(0),
  active: z.boolean().default(true),
  destinationSpecNotes: text.optional(),
});

export const vehicleSchema = z.object({
  vin: text.optional(),
  stockNumber: text.optional(),
  make: z.string().trim().min(1, "Make is required"),
  model: z.string().trim().min(1, "Model is required"),
  trim: text.optional(),
  year: z.number().int().optional(),
  body: text.optional(),
  drivetrain: text.optional(),
  colorExterior: text.optional(),
  colorInterior: text.optional(),
  mileage: z.number().int().nonnegative().optional(),
  condition: z.enum(CONDITIONS),
  price: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  status: z.enum(VEHICLE_STATUSES),
  source: z.enum(VEHICLE_SOURCES).optional(),
  etaDate: z.coerce.date().optional(),
  location: text.optional(),
  newExportRestricted: z.boolean().default(false),
});

export const dealSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().optional(),
  stageId: z.string().min(1, "Stage is required"),
  title: text.optional(),
  value: z.number().nonnegative().optional(),
  depositAmount: z.number().nonnegative().optional(),
  notes: text.optional(),
});

export const activitySchema = z.object({
  customerId: z.string().min(1),
  type: z.enum(ACTIVITY_TYPES),
  body: z.string().trim().min(1, "Add some detail"),
  summary: text.optional(),
  occurredAt: z.coerce.date().optional(),
});
