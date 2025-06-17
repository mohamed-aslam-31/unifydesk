CREATE TABLE "captchas" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"question" text NOT NULL,
	"answer" varchar(50) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"solved" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "captchas_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "otp_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"type" varchar(10) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt" timestamp,
	"blocked_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"data" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"country_code" varchar(10) NOT NULL,
	"is_whatsapp" boolean DEFAULT false NOT NULL,
	"gender" varchar(20) NOT NULL,
	"date_of_birth" varchar(10) NOT NULL,
	"country" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"address" text,
	"password" text NOT NULL,
	"firebase_uid" varchar(128),
	"role" varchar(20),
	"role_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"profile_picture" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "role_data" ADD CONSTRAINT "role_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;