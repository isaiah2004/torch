CREATE TABLE "bible_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"language" varchar(8) DEFAULT 'en' NOT NULL,
	"license" text,
	"copyright" text,
	"provider" varchar(64),
	"can_redistribute" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_verses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation" varchar(16) NOT NULL,
	"book" varchar(32) NOT NULL,
	"book_number" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bible_translations_code_idx" ON "bible_translations" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "bible_verses_ref_idx" ON "bible_verses" USING btree ("translation","book","chapter","verse");--> statement-breakpoint
CREATE INDEX "bible_verses_order_idx" ON "bible_verses" USING btree ("translation","book_number","chapter","verse");