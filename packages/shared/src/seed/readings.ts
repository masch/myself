import type { SeedAuthor, SeedReading } from "../index";

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
  CHARLES_BAUDELAIRE: "a0000000-0000-4000-8000-000000000010",
  DAVID_WHYTE: "a0000000-0000-4000-8000-000000000011",
} as const;

export const SEED_AUTHORS: SeedAuthor[] = [
  {
    id: SEED_AUTHOR_IDS.MARCUS_AURELIUS,
    name: "Marco Aurelio",
    bio: "Emperador romano y filósofo estoico, autor de las Meditaciones.",
    createdAt: "2026-08-15T08:00:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.SENECA,
    name: "Séneca",
    bio: "Filósofo estoico, estadista y dramaturgo romano.",
    createdAt: "2026-08-16T09:00:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.EPICTETUS,
    name: "Epicteto",
    bio: "Filósofo estoico griego, nacido esclavo en Hierápolis.",
    createdAt: "2026-08-18T10:00:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.LAO_TZU,
    name: "Lao-Tse",
    bio: "Antiguo filósofo y escritor chino, figura central del taoísmo.",
    createdAt: "2026-08-14T06:45:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.THICH_NHAT_HANH,
    name: "Thich Nhat Hanh",
    bio: "Monje budista zen vietnamita, activista por la paz y maestro de mindfulness.",
    createdAt: "2026-08-17T07:30:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.JOHN_O_DONOHUE,
    name: "John O’Donohue",
    bio: "Poeta, filósofo y místico celta irlandés, autor de Anam Cara.",
    createdAt: "2026-08-19T08:30:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.RAIMON_PANIKKAR,
    name: "Raimon Panikkar",
    bio: "Teólogo y filósofo hispano-indio, pionero del diálogo interreligioso e intercultural.",
    createdAt: "2026-08-31T08:00:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.FRANCISCO_LUIS_BERNARDEZ,
    name: "Francisco Luis Bernárdez",
    bio: "Poeta y diplomático argentino, figura clave de la lírica espiritual.",
    createdAt: "2026-09-01T08:00:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.MARY_OLIVER,
    name: "Mary Oliver",
    bio: "Poeta estadounidense, ganadora del Premio Pulitzer, celebrada por su profunda contemplación de la naturaleza y la quietud.",
    createdAt: "2026-09-02T08:00:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.CHARLES_BAUDELAIRE,
    name: "Charles Baudelaire",
    bio: "Poeta, ensayista y crítico de arte francés, figura clave de la lírica moderna y el simbolismo.",
    createdAt: "2026-09-03T08:00:00-03:00",
  },
  {
    id: SEED_AUTHOR_IDS.DAVID_WHYTE,
    name: "David Whyte",
    bio: "Poeta y filósofo angloirlandés, célebre por su mirada profunda sobre la quietud, el coraje y la vida contemplativa.",
    createdAt: "2026-09-04T08:00:00-03:00",
  },
];

export const SEED_READINGS: SeedReading[] = [
  {
    id: "r0000000-0000-4000-8000-000000000001",
    author_id: SEED_AUTHOR_IDS.MARCUS_AURELIUS,
    createdAt: "2026-08-15T08:00:00-03:00",
    readDates: ["2026-08-20T08:30:00-03:00", "2026-08-24T07:45:00-03:00"],
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
    createdAt: "2026-08-16T09:00:00-03:00",
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
    createdAt: "2026-08-17T07:30:00-03:00",
    readDates: ["2026-08-25T08:00:00-03:00"],
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
    createdAt: "2026-08-18T10:00:00-03:00",
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
    createdAt: "2026-08-14T06:45:00-03:00",
    readDates: [
      "2026-08-18T09:00:00-03:00",
      "2026-08-21T08:15:00-03:00",
      "2026-08-23T07:30:00-03:00",
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
    createdAt: "2026-08-19T08:30:00-03:00",
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
    createdAt: "2026-08-31T08:00:00-03:00",
    readDates: ["2026-08-31T08:30:00-03:00"],
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
    createdAt: "2026-09-01T08:00:00-03:00",
    readDates: ["2026-09-01T08:30:00-03:00"],
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
    createdAt: "2026-09-02T08:00:00-03:00",
    readDates: ["2026-09-02T08:30:00-03:00"],
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
construyendo el universo.`,
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
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000010",
    author_id: SEED_AUTHOR_IDS.CHARLES_BAUDELAIRE,
    createdAt: "2026-09-03T08:00:00-03:00",
    readDates: ["2026-09-03T08:30:00-03:00"],
    translations: {
      es: {
        title: "Elevación",
        content: `Por encima de estanques, por encima de valles, 
de montañas y bosques, de mares y de nubes, 
más allá de los soles, más allá de los éteres, 
más allá del confín de estrelladas esferas,

te desplazas, mi espíritu, con toda agilidad 
y como un nadador que se extasía en las olas, 
alegremente surcas la inmensidad profunda 
con voluptuosidad indecible y viril.

Escápate muy lejos de estos mórbidos miasmas, 
sube a purificarte al aire superior 
y apura, como un noble y divino licor, 
la luz clara que inunda los límpidos espacios.

Detrás de los hastíos y los hondos pesares
que abruman con su peso la neblinosa vida,
¡feliz aquel que puede con brioso aleteo 
lanzarse hacia los campos luminosos y calmos!

Aquel cuyas ideas, cual si fueran alondras, 
levantan hacia el cielo matutino su vuelo
¡que planea sobre todo, y sabe sin esfuerzo, 
la lengua de las flores y de las cosas mudas!`,
      },
    },
  },
  {
    id: "r0000000-0000-4000-8000-000000000011",
    author_id: SEED_AUTHOR_IDS.DAVID_WHYTE,
    createdAt: "2026-09-04T08:00:00-03:00",
    readDates: ["2026-09-04T08:30:00-03:00"],
    translations: {
      es: {
        title: "Mameen",
        content: `Sé infinitesimal bajo ese cielo, una criatura
que ni siquiera el halcón vigilante divisa, un espectro
entre las rocas donde la niebla se disipa lentamente.

Recuerda la forma en que los simples mortales se ven abrumados
por las circunstancias, cómo las grandes reputaciones
se disuelven en la fragilidad y cómo tú,
en particular, estás a una brizna de perder
a todos los que amas.

Luego, mira hacia atrás el camino al sur,
por donde viniste, como si vieras
todo tu pasado, y luego al norte
sobre la brumosa costa azul, como si hicieras presente
un vasto futuro.

Recuerda la forma en que tú eres todas las posibilidades
que puedes ver y cómo vives mejor
apreciando los horizontes
ya sea que los alcances o no.

Admite, que una vez que te levantas 
de tu silla y abres la puerta, 
una vez que sales al aire libre 
hacia ese límite y tomas el camino que sube alto
más allá de lo ordinario, te conviertes 
en el privilegiado y en el peregrino, 
en aquél que contará la historia 
y en aquel, que al regresar 
de la montaña, 
habrá ayudado a hacerla realidad.`,
      },
      en: {
        title: "Mameen",
        content: `Be infinitesimal under that sky, a creature 
even the sailing hawk misses, a wraith 
among the rocks where the mist parts slowly.

Recall the way mere mortals are overwhelmed 
by circumstance, how great reputations 
dissolve with infirmity and how you, 
in particular, stand a hairbreadth from losing 
everyone you hold dear.

Then, look back down the path to the north, 
the way you came, as if seeing 
your entire past and then south 
over the hazy blue coast as if present 
to a broad future.

Recall the way you are all possibilities 
you can see and how you live best 
as an appreciator of horizons 
whether you reach them or not.

Admit, that once you have got up 
from your chair and opened the door, 
once you have walked out into the clear air 
toward that edge and taken the path up high 
beyond the ordinary, you have become

the privileged and the pilgrim, 
the one who will tell the story 
and the one, coming back 
from the mountain 
who helped to make it.`
      },
    },
  },
];
