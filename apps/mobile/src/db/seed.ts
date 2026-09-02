import { generateUUID } from "@/utils/uuid";
import type {
  ReadingTranslationInput,
  SeedAuthor,
  SeedReading,
  SeedUser,
} from "@myself/shared";
import { type SQLiteDatabase } from "expo-sqlite";

export type { ReadingTranslationInput, SeedReading };

// Deterministic UUIDs for seed authors
export const SEED_AUTHOR_IDS = {
  MARCUS_AURELIUS: "a0000000-0000-4000-8000-000000000001",
  SENECA: "a0000000-0000-4000-8000-000000000002",
  EPICTETUS: "a0000000-0000-4000-8000-000000000003",
  LAO_TZU: "a0000000-0000-4000-8000-000000000004",
  THICH_NHAT_HANH: "a0000000-0000-4000-8000-000000000005",
  JOHN_O_DONOHUE: "a0000000-0000-4000-8000-000000000006",
  RAIMON_PANIKKAR: "a0000000-0000-4000-8000-000000000007",
  FRANCISCO_LUIS_BERNARDEZ: "a0000000-0000-4000-8000-000000000008",
  MARY_OLIVER: "a0000000-0000-4000-8000-000000000009",
} as const;

export const SEED_AUTHORS: SeedAuthor[] = [
  {
    id: SEED_AUTHOR_IDS.MARCUS_AURELIUS,
    name: "Marco Aurelio",
    bio: "Emperador romano y filósofo estoico, autor de las Meditaciones.",
  },
  {
    id: SEED_AUTHOR_IDS.SENECA,
    name: "Séneca",
    bio: "Filósofo estoico, estadista y dramaturgo romano.",
  },
  {
    id: SEED_AUTHOR_IDS.EPICTETUS,
    name: "Epicteto",
    bio: "Filósofo estoico griego, nacido esclavo en Hierápolis.",
  },
  {
    id: SEED_AUTHOR_IDS.LAO_TZU,
    name: "Lao-Tse",
    bio: "Antiguo filósofo y escritor chino, figura central del taoísmo.",
  },
  {
    id: SEED_AUTHOR_IDS.THICH_NHAT_HANH,
    name: "Thich Nhat Hanh",
    bio: "Monje budista zen vietnamita, activista por la paz y maestro de mindfulness.",
  },
  {
    id: SEED_AUTHOR_IDS.JOHN_O_DONOHUE,
    name: "John O’Donohue",
    bio: "Poeta, filósofo y místico celta irlandés, autor de Anam Cara.",
  },
  {
    id: SEED_AUTHOR_IDS.RAIMON_PANIKKAR,
    name: "Raimon Panikkar",
    bio: "Teólogo y filósofo hispano-indio, pionero del diálogo interreligioso e intercultural.",
  },
  {
    id: SEED_AUTHOR_IDS.FRANCISCO_LUIS_BERNARDEZ,
    name: "Francisco Luis Bernárdez",
    bio: "Poeta y diplomático argentino, figura clave de la lírica espiritual.",
  },
  {
    id: SEED_AUTHOR_IDS.MARY_OLIVER,
    name: "Mary Oliver",
    bio: "Poeta estadounidense, ganadora del Premio Pulitzer, celebrada por su profunda contemplación de la naturaleza y la quietud.",
  },
];

export const SEED_READINGS: SeedReading[] = [
  {
    id: "r0000000-0000-4000-8000-000000000001",
    author_id: SEED_AUTHOR_IDS.MARCUS_AURELIUS,
    createdAt: "2026-08-15 08:00:00",
    readDates: ["2026-08-20 08:30:00", "2026-08-24 07:45:00"],
    translations: {
      es: {
        title: "Poder sobre la Mente",
        content: `*Tienes poder sobre tu mente,*
  no sobre los acontecimientos externos.

  Reconoce esto,
    y encontrarás
      **una fuerza inquebrantable**.

> La quietud interior nace al soltar lo que no puedes controlar.`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000002",
    author_id: SEED_AUTHOR_IDS.SENECA,
    createdAt: "2026-08-16 09:00:00",
    readDates: [],
    translations: {
      es: {
        title: "Imaginación vs Realidad",
        content: `Sufrimos más a menudo
  en la *imaginación*
    que en la **realidad**.

La verdadera serenidad
  es habitar el presente,
    sin dependencia ansiosa
      del porvenir.`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000003",
    author_id: SEED_AUTHOR_IDS.THICH_NHAT_HANH,
    createdAt: "2026-08-17 07:30:00",
    readDates: ["2026-08-25 08:00:00"],
    translations: {
      es: {
        title: "El Puente de la Respiración",
        content: `Sonríe, respira
  y camina despacio.

*La respiración es el puente*
  que une la vida con la conciencia,
    que abraza tu cuerpo
      con tus pensamientos en calma.

> Al inhalar, calmo mi cuerpo.
> Al exhalar, sonrío.`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000004",
    author_id: SEED_AUTHOR_IDS.EPICTETUS,
    createdAt: "2026-08-18 10:00:00",
    readDates: [],
    translations: {
      es: {
        title: "Encarnar la Filosofía",
        content: `No expliques tu filosofía:
  **encárnala**.

La riqueza no consiste
  en poseer grandes bienes,
    sino en tener
      *pocos deseos*.`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000005",
    author_id: SEED_AUTHOR_IDS.LAO_TZU,
    createdAt: "2026-08-14 06:45:00",
    readDates: [
      "2026-08-18 09:00:00",
      "2026-08-21 08:15:00",
      "2026-08-23 07:30:00",
    ],
    translations: {
      es: {
        title: "La Fortaleza del Silencio",
        content: `El silencio es una fuente
  de **gran fortaleza**.

La naturaleza no se apresura,
  y sin embargo,
    *todo florece a su debido tiempo*.

> Vacía tu mente de todo afán;
> descansa en el centro del ser.`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000006",
    author_id: SEED_AUTHOR_IDS.JOHN_O_DONOHUE,
    createdAt: "2026-08-19 08:30:00",
    readDates: [],
    translations: {
      es: {
        title: "Bendición al pertenecer",
        content: `Que escuches tu anhelo de ser libre.

Que tus marcos de pertenencia sean generosos para dar suficiente espacio a tus sueños.

Que te levantes cada día con una voz de bendición susurrando en tu corazón.

Que encuentres una armonía entre tu alma y tu vida.

Que el santuario de tu alma nunca sea ensombrecido.

Que conozcas el eterno anhelo que vive en el corazón del tiempo.

Que haya bondad en tu mirada cuando mires hacia adentro.

Que nunca levantes muros entre la luz y tú mismo.

Que permitas que la belleza salvaje del mundo invisible te reúna, te cuide y te abrace en pertenencia.`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000007",
    author_id: SEED_AUTHOR_IDS.RAIMON_PANIKKAR,
    createdAt: "2026-08-31 08:00:00",
    readDates: ["2026-08-31 08:30:00"],
    translations: {
      es: {
        title: "Extracto de ICONOS DEL MISTERIO",
        content: `El silencio de la Vida es aquel arte de saber silenciar las actividades de la vida para llegar a la experiencia pura de la Vida.
 
Con frecuencia, identificamos la vida con las actividades de la vida e identificamos nuestro ser con nuestros pensamientos, sentimientos, deseos, voluntad, con todo cuanto hacemos y tenemos. Instrumentalizamos nuestra vida olvidando que es un fin en sí misma. Inmersos, atareados, en las actividades de la vida, perdemos la facultad de escuchar y nos enajenamos de nuestra misma fuente: el Silencio, el No-ser, Dios.
 
El Silencio asoma en el momento en que estamos situados en la fuente misma del Ser; la fuente del Ser no es el Ser, sino «la fuente» del Ser – el Ser ya está de este lado de la cortina – .
Este locus previo, anterior, originante, es el Silencio de la Vida.
La Vida pura y desnuda es el don que nos ha sido dado – y que en última instancia somos. Diciéndolo en términos cristianos:
«Yo he venido para que tengan vida y vida abundante»
(Juan X, 10).`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000008",
    author_id: SEED_AUTHOR_IDS.FRANCISCO_LUIS_BERNARDEZ,
    createdAt: "2026-09-01 08:00:00",
    readDates: ["2026-09-01 08:30:00"],
    translations: {
      es: {
        title: "FRAGMENTO de EL RUISEÑOR",
        content: `.......  Todas las cosas descansaban con esa calma que precede a la hermosura.
Y de repente el bosque entero se conmovió con una voz como ninguna.
Primero fue como una queja, como un sollozo de cristal, como un gemido.
Luego un sonido entrecortado por el murmullo tembloroso de los pinos.
Más tarde un hilo melodioso, luego una pausa y un rumor, después un trino.
Y al fin el canto, el canto, el canto del ruiseñor en el silencio conmovido.
Un canto limpio y armonioso, cuyo fervor era del aire sensitivo.
Y cuyas notas inflamadas resplandecían como gotas de rocío.
El canto ardía en el silencio con el misterio de un lucero lejanísimo.
Impenetrable y luminoso como un purísimo diamante, pero vivo.
Cerrada estaba todavía para mi frente silenciosa a la Belleza.
Y de repente, por el canto del ruiseñor, tuve noción de su grandeza.
El gran amor que lo encendía se derramaba de su voz con inocencia.
Y algo del bien que yo ignoraba caía en gotas de emoción en mi conciencia.
Entonces vi con toda el alma que aquella voz era un destello de la eterna.
Que la pasión que la inflamaba me daba el ser para que yo la comprendiera.
Que aquel amor era la fuente del manso río de mis ojos y mis venas.
Y la raíz que alimentaba la voz del mar y la canción de las estrellas.
Luego salí de mis sentidos y me encontré desamparado en las tinieblas.
Y sin más luz que la del canto me fui perdiendo en un olvido sin fronteras.
Y así, perdido para todos, hallé el sendero de mi vida en aquel canto.
Tuve conciencia de mi rumbo, supe la causa y el objeto de mis pasos.
Vi la razón de haber nacido, de amar la luz, de ser feliz, de haber llorado.
De haber estado pensativo, de ver, de oír, de comprender, de estar soñando.
Más inventivo que el del fuego, su movimiento era el del alma y el del río.
Se deslizaba por el tiempo, pero en la paz del corazón estaba fijo.
Al despertar alcé los ojos, y no recuerdo si después junté las manos.
Sólo recuerdo que la dicha me hacía sitio con amor en su regazo.
El alma erraba por el bosque con un dulcísimo rumor de pies descalzos.
Y ya se oía el de las cosas entre los trinos cada vez más espaciados.
Luego cesó la melodía del ruiseñor y se apagó la de los astros.
Pero en mi frente silenciosa la voz divina ya se había despertado`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000009",
    author_id: SEED_AUTHOR_IDS.MARY_OLIVER,
    createdAt: "2026-09-02 08:00:00",
    readDates: ["2026-09-02 08:30:00"],
    translations: {
      es: {
        title: "Canción de los constructores",
        content: `Una mañana de verano,
me senté
en la ladera de una colina
para pensar en Dios,
un pasatiempo digno.
Cerca de mí, vi
un solo grillo;
movía los granos de la ladera
de un lado a otro.
Qué grande era su energía,
qué humilde su esfuerzo.
Esperemos
que siempre sea así,
que cada uno de nosotros siga adelante
a su manera inexplicable,
construyendo el universo.`
      },
      en: {
        title: "Song of the Builders",
        content: `On a summer morning
I sat down
on a hillside
to think about God -
a worthy pastime.
Near me, I saw
a single cricket;
it was moving the grains of the hillside
this way and that way.
How great was its energy,
how humble its effort.
Let us hope
it will always be like this,
each of us going on
in our inexplicable ways
building the universe.`,
      }
    },
  },
  /*
  {
    id: "r0000000-0000-4000-8000-000000000010",
    author_id: SEED_AUTHOR_IDS.RAIMON_PANIKKAR,
    createdAt: "2026-09-03 08:00:00",
    readDates: ["2026-09-03 08:30:00"],
    translations: {
      es: {
        title: "",
        content: ``,
      },
    },
  },
  */
];

export const SEED_USERS: SeedUser[] = [
  {
    id: "u0000000-0000-4000-8000-000000000001",
    name: "My self",
    email: "the.masch@gmail.com",
    tasks: [
      {
        title: "Setup Expo SDK 57 project",
        category: "Work",
        description: "Configure Expo Router, Native Tabs, and @expo/ui",
        is_done: 1,
      },
      {
        title: "Implement Local-First SQLite storage",
        category: "Work",
        description: "Create schema, domain hooks, and auto-migrations",
        is_done: 1,
      },
      {
        title: "Review PR for Offline Sync",
        category: "Work",
        description: "Evaluate PowerSync vs ElectricSQL architecture",
        is_done: 0,
      },
      {
        title: "Buy specialty coffee beans",
        category: "Shopping",
        description: "Ethiopian Yirgacheffe medium roast",
        is_done: 0,
      },
    ],
  },
  {
    id: "u0000000-0000-4000-8000-000000000002",
    name: "Elena Gómez",
    email: "elena.gomez@example.com",
    tasks: [
      {
        title: "Design UI tokens in Figma",
        category: "Design",
        description: "Apple HIG dynamic colors & Material 3 palette",
        is_done: 1,
      },
      {
        title: "Conduct user testing session",
        category: "Work",
        description: "Interview 5 mobile beta testers on tabs navigation",
        is_done: 0,
      },
    ],
  },
  {
    id: "u0000000-0000-4000-8000-000000000003",
    name: "Lucas Rossi",
    email: "lucas.rossi@example.com",
    tasks: [
      {
        title: "Prepare Sprint Review demo",
        category: "Work",
        description: "Showcase multi-user database switching and SQLite CRUD",
        is_done: 0,
      },
    ],
  },
];

/**
 * Seeds the database with users, tasks, authors, readings, and reading logs.
 */
export async function seedDatabase(db: SQLiteDatabase) {
  // 1. Always Sync / Upsert Authors
  for (const author of SEED_AUTHORS) {
    await db.runAsync(
      `INSERT INTO authors (id, name, bio) 
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET 
         name = excluded.name, 
         bio = excluded.bio`,
      [author.id, author.name, author.bio ?? ""],
    );
  }

  // 2. Always Sync / Upsert Meditation Readings & Translations
  for (const reading of SEED_READINGS) {
    await db.runAsync(
      `INSERT INTO meditation_readings (id, author_id, created_at) 
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET 
         author_id = excluded.author_id`,
      [reading.id, reading.author_id, reading.createdAt],
    );

    // Upsert Spanish translation (mandatory)
    await db.runAsync(
      `INSERT INTO meditation_reading_translations (reading_id, locale, title, content)
       VALUES (?, 'es', ?, ?)
       ON CONFLICT(reading_id, locale) DO UPDATE SET
         title = excluded.title,
         content = excluded.content`,
      [
        reading.id,
        reading.translations.es.title,
        reading.translations.es.content,
      ],
    );

    // Upsert English translation (optional)
    if (reading.translations.en) {
      await db.runAsync(
        `INSERT INTO meditation_reading_translations (reading_id, locale, title, content)
         VALUES (?, 'en', ?, ?)
         ON CONFLICT(reading_id, locale) DO UPDATE SET
           title = excluded.title,
           content = excluded.content`,
        [
          reading.id,
          reading.translations.en.title,
          reading.translations.en.content,
        ],
      );
    }

    for (const readDate of reading.readDates) {
      const existingLog = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM reading_logs WHERE reading_id = ? AND read_at = ? LIMIT 1",
        [reading.id, readDate],
      );
      if (!existingLog) {
        const logId = generateUUID();
        await db.runAsync(
          "INSERT INTO reading_logs (id, reading_id, read_at) VALUES (?, ?, ?)",
          [logId, reading.id, readDate],
        );
      }
    }
  }

  // 2. Seed Users & Tasks if users are empty
  const existingUsers = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM users LIMIT 1",
  );

  if (existingUsers.length === 0) {
    for (const user of SEED_USERS) {
      await db.runAsync(
        "INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)",
        [user.id, user.name, user.email],
      );

      for (const task of user.tasks) {
        const taskId = generateUUID();
        await db.runAsync(
          "INSERT INTO tasks (id, user_id, title, category, description, is_done) VALUES (?, ?, ?, ?, ?, ?)",
          [
            taskId,
            user.id,
            task.title,
            task.category,
            task.description,
            task.is_done,
          ],
        );
      }
    }
  }
}
