CREATE TABLE `questions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`order` integer NOT NULL,
	`active` integer DEFAULT 1
);

CREATE TABLE `survey_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text,
	`responses` text NOT NULL,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP
);

--> Initial questions
INSERT INTO questions (id, text, `order`, active) VALUES
(1, 'Besitzen Sie mehrere Mietobjekte?', 1, 1),
(2, 'Haben Sie Schwierigkeiten, Mietzahlungen nachzuverfolgen?', 2, 1),
(3, 'Verwenden Sie derzeit Excel zur Verwaltung Ihrer Immobilien?', 3, 1),
(4, 'Ist das Beantworten von Mieteranfragen zeitaufwändig?', 4, 1),
(5, 'Fällt es Ihnen schwer, den Überblick über Wartungsarbeiten zu behalten?', 5, 1),
(6, 'Machen Sie sich Sorgen über die Einhaltung deutscher Mietgesetze?', 6, 1),
(7, 'Verwalten Sie Ihre Mietobjekte aus der Ferne?', 7, 1),
(8, 'Haben Sie Probleme mit regelmäßigen Finanzberichten?', 8, 1),
(9, 'Möchten Sie die Kommunikation mit Mietern automatisieren?', 9, 1),
(10, 'Haben Sie Schwierigkeiten bei der Verwaltung von Nebenkostenabrechnungen?', 10, 1),
(11, 'Erstellen Sie Mietverträge manuell?', 11, 1),
(12, 'Haben Sie ein System zur Mieterauswahl?', 12, 1),
(13, 'Haben Sie mit Leerstandsquoten Ihrer Immobilien zu kämpfen?', 13, 1),
(14, 'Fällt Ihnen die Steuerdokumentation für Ihre Immobilien schwer?', 14, 1),
(15, 'Würden Sie von automatischen Zahlungserinnerungen profitieren?', 15, 1),
(16, 'Haben Sie ein System zur Bearbeitung von Wartungsanfragen?', 16, 1),
(17, 'Interessieren Sie sich für die Analyse der Leistung Ihrer Immobilien?', 17, 1),
(18, 'Empfinden Sie den Abgleich von Kontoauszügen als mühsam?', 18, 1),
(19, 'Möchten Sie den Verwaltungsaufwand bei der Immobilienverwaltung reduzieren?', 19, 1),
(20, 'Suchen Sie nach besseren Möglichkeiten zur Verwaltung von Immobiliendokumenten?', 20, 1);