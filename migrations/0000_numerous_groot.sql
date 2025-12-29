CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"service_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"total_profiles" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"expiration_date" timestamp NOT NULL,
	"is_renewable" boolean DEFAULT true NOT NULL,
	"cost" real NOT NULL,
	"price_per_profile" real DEFAULT 0 NOT NULL,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"description" text NOT NULL,
	"amount" real NOT NULL,
	"type" varchar(20) NOT NULL,
	"profile_id" varchar,
	"account_id" varchar,
	"note" text,
	"reference" text,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"pin" text,
	"client_id" varchar,
	"price" real,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"color" varchar(7) NOT NULL,
	"max_profiles" integer DEFAULT 7 NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"default_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"notification_channel" varchar(20) DEFAULT 'telegram' NOT NULL,
	"days_before_expiry" integer DEFAULT 3 NOT NULL,
	"notification_time" varchar(5) DEFAULT '09:00' NOT NULL,
	"telegram_bot_token" text,
	"telegram_chat_id" text,
	"whatsapp_phone_number" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
