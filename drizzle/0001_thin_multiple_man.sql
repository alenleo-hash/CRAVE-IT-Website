CREATE TABLE `food_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemId` varchar(100) NOT NULL,
	`feedback` enum('love','not_for_me','too_expensive','too_spicy') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_items` (
	`userId` int NOT NULL,
	`itemId` varchar(100) NOT NULL,
	`kind` enum('dish','recipe') NOT NULL,
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_items_userId_itemId_kind_pk` PRIMARY KEY(`userId`,`itemId`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`userId` int NOT NULL,
	`profile` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `food_feedback` ADD CONSTRAINT `food_feedback_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_items` ADD CONSTRAINT `saved_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;