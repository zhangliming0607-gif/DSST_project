CREATE TABLE `experiment_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`configData` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `experiment_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `experiment_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`userId` int,
	`participantId` varchar(128) NOT NULL,
	`conditionId` varchar(128) NOT NULL,
	`conditionName` varchar(256) NOT NULL,
	`startTime` bigint NOT NULL,
	`endTime` bigint NOT NULL,
	`totalTrials` int NOT NULL,
	`correctCount` int NOT NULL,
	`errorCount` int NOT NULL,
	`accuracyRate` varchar(20) NOT NULL,
	`meanReactionTimeMs` int NOT NULL,
	`medianReactionTimeMs` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `experiment_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `experiment_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `trial_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`trialNumber` int NOT NULL,
	`presentedDigit` int NOT NULL,
	`correctSymbol` varchar(10) NOT NULL,
	`correctKey` varchar(10) NOT NULL,
	`respondedKey` varchar(10) NOT NULL,
	`respondedSymbol` varchar(10) NOT NULL,
	`isCorrect` boolean NOT NULL,
	`reactionTimeMs` int NOT NULL,
	`conditionId` varchar(128) NOT NULL,
	`currentDigitSymbolMap` json NOT NULL,
	`trialTimestamp` bigint NOT NULL,
	CONSTRAINT `trial_logs_id` PRIMARY KEY(`id`)
);
