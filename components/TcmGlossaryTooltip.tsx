import React from 'react';
import { Language } from '../types';

export interface GlossaryItem {
  id: string;
  terms: string[]; // List of matching terms for this gloss item (case-insensitive)
  nameEn: string;
  nameId: string;
  definitionEn: string;
  definitionId: string;
}

export const TCM_GLOSSARY: GlossaryItem[] = [
  {
    id: 'liver_qi_stagnation',
    terms: ['Liver Qi Stagnation', 'Stagnasi Qi Hati', 'Stagnasi Qi', 'Liver Qi'],
    nameEn: 'Liver Qi Stagnation',
    nameId: 'Stagnasi Qi Hati',
    definitionEn: 'A foundational pattern in TCM where the flow of Liver Qi is constrained, usually by emotional stress, leading to chest or rib-side tension, mood volatility, irritability, or sighing.',
    definitionId: 'Pola dasar dalam TCM di mana aliran Qi Hati tersumbat, biasanya akibat beban emosional, memicu ketegangan dada/lambung, ketidakstabilan emosi, amarah terpendam, atau sering menghela napas.'
  },
  {
    id: 'damp_heat',
    terms: ['Damp-Heat', 'Lembab-Panas', 'Lembab Panas', 'Damp Heat'],
    nameEn: 'Damp-Heat',
    nameId: 'Lembab-Panas',
    definitionEn: 'A pathological synergy of excessive sluggish moisture (Damp) and localized inflammation (Heat), resulting in sticky tongue coating, skin eruptions, heavy limbs, or yellow body fluids.',
    definitionId: 'Kombinasi patologis antara penumpukan cairan kental (Lembab) dan peradangan internal (Panas), bermanifestasi berupa selaput lidah yang tebal berminyak, jerawat keringat, tubuh terasa berat, atau urin pekat.'
  },
  {
    id: 'spleen_qi_deficiency',
    terms: ['Spleen Qi Deficiency', 'Defisiensi Qi Limpa', 'Spleen Qi', 'Qi Limpa'],
    nameEn: 'Spleen Qi Deficiency',
    nameId: 'Defisiensi Qi Limpa',
    definitionEn: 'Weakened transformation and digestive power of the Spleen, leading to immediate post-meal bloating, fatigue, soft/loose stools, poor appetite, and a pale tongue.',
    definitionId: 'Kelemahan energi pencernaan dan metabolisme cairan oleh Limpa, ditandai perut kembung segera setelah makan, kelelahan, tinja lembek, nafsu makan buruk, dan lidah pucat.'
  },
  {
    id: 'kidney_yin_deficiency',
    terms: ['Kidney Yin Deficiency', 'Defisiensi Yin Ginjal', 'Kidney Yin', 'Yin Ginjal'],
    nameEn: 'Kidney Yin Deficiency',
    nameId: 'Defisiensi Yin Ginjal',
    definitionEn: 'Depletion of cooling, lubricating fluids in the Kidney system, causing night sweats, dry mouth and throat, low back soreness, warm palms/soles, and a red tongue with sparse/no coating.',
    definitionId: 'Penurunan cairan pendingin dan penutrisi pada Ginjal, memicu keringat malam, mulut/tenggorokan kering, nyeri linu punggung bawah, telapak tangan/kaki panas, serta lidah merah tanpa selaput.'
  },
  {
    id: 'kidney_yang_deficiency',
    terms: ['Kidney Yang Deficiency', 'Defisiensi Yang Ginjal', 'Kidney Yang', 'Yang Ginjal'],
    nameEn: 'Kidney Yang Deficiency',
    nameId: 'Defisiensi Yang Ginjal',
    definitionEn: 'Depletion of dynamic warming energy from the Kidneys, inducing deep cold intolerance, pale complexion, lower back weakness, frequent clear urination, and a wet, pale/swollen tongue.',
    definitionId: 'Kekurangan energi penghangat vital dari Ginjal, memicu rasa takut dingin yang ekstrem, wajah pucat, lutut lemas dingin, sering berkemih jernih, dan lidah pucat basah.'
  },
  {
    id: 'liver_yang_rising',
    terms: ['Liver Yang Rising', 'Yang Hati Meningkat', 'Yang Hati'],
    nameEn: 'Liver Yang Rising',
    nameId: 'Yang Hati Meningkat',
    definitionEn: 'The upward escape of Liver warming energy due to underlying Yin starvation, causing throbbing temporal headaches, dizziness, high-pitched tinnitus, redness of eyes, and hyper-reactivity.',
    definitionId: 'Lonjakan energi aktif (Yang) Hati ke arah atas akibat kekurangan Yin penutrisi di bawah, ditandai dengan migren berdenyut, pusing berputar, telinga berdenging nyaring, mata merah, dan tempramen tinggi.'
  },
  {
    id: 'blood_deficiency',
    terms: ['Blood Deficiency', 'Defisiensi Darah', 'Defisit Darah', 'Blood Deficit'],
    nameEn: 'Blood Deficiency',
    nameId: 'Defisiensi Darah',
    definitionEn: 'Inadequate volume or nourishing quality of blood, inducing dull-dizzy vision, pale lips/nails, brittle nails, parched skin, sleep onset insomnia, and a thin pale tongue.',
    definitionId: 'Kondisi di mana kualitas dan volume darah kurang untuk menutrisi tubuh, bermanifestasi sebagai kelopak mata bagian dalam pucat, pandangan kabur, kulit kering bersisik, susah tidur, dan lidah pucat.'
  },
  {
    id: 'blood_stasis',
    terms: ['Blood Stasis', 'Stagnasi Darah', 'Stasis Darah'],
    nameEn: 'Blood Stasis',
    nameId: 'Stagnasi Darah',
    definitionEn: 'Sluggishness, stagnation, or blockages in the movement of blood. It produces sharp, boring, fixed pains, dark purple spots on the tongue body, and tendency to develop palpable swellings.',
    definitionId: 'Hambatan atau penyumbatan sirkulasi darah lokal, memicu rasa nyeri tajam menusuk yang menetap di satu titik, tanda memar, bibir gelap, atau bintik ungu-kehitaman pada lidah.'
  },
  {
    id: 'wind_cold',
    terms: ['Wind-Cold', 'Angin-Dingin', 'Angin Dingin', 'Wind Cold'],
    nameEn: 'Wind-Cold',
    nameId: 'Angin-Dingin',
    definitionEn: 'Acute invasion of atmospheric cold combined with wind, triggering stiffness of neck, aversion to cold, clear nasal discharge, lack of perspiration, and a thin white tongue coat.',
    definitionId: 'Serangan patogen luar dingin yang terbawa angin, memicu leher kaku, menggigil takut dingin, pilek encer jernih, tidak bisa berkeringat, dan selaput lidah tipis putih.'
  },
  {
    id: 'wind_heat',
    terms: ['Wind-Heat', 'Angin-Panas', 'Angin Panas', 'Wind Heat'],
    nameEn: 'Wind-Heat',
    nameId: 'Angin-Panas',
    definitionEn: 'Acute attack of heat pathogens via respiratory portals, manifesting with fever, dry throat, thirst, sweating, cough with yellow phlegm, or red tip/sides of tongue.',
    definitionId: 'Invasi patogen panas dari lingkungan sekitar, memicu demam, tenggorokan kering meradang, rasa haus tinggi, batuk kering/dahak kuning, serta ujung lidah merah berbintik.'
  },
  {
    id: 'phlegm_damp',
    terms: ['Phlegm-Damp', 'Dahak-Lembab', 'Dahak Lembab', 'Damp Phlegm'],
    nameEn: 'Phlegm-Damp',
    nameId: 'Dahak-Lembab',
    definitionEn: 'Heavy mucus accumulation causing sluggishness, brain-fog, chest stuffing, phlegm production in throat, nausea, and a thick, greasy/slippery tongue coat.',
    definitionId: 'Akumulasi lendir kental atau sisa cairan metabolisme yang tidak lancar, menyebabkan rasa berat, kabut otak (brain fog), sesak dada, batuk berdahak, serta selaput lidah tebal mengkilap.'
  },
  {
    id: 'liver_fire',
    terms: ['Liver Fire Blazing', 'Api Hati', 'Liver Fire', 'Api Hati Berkobar'],
    nameEn: 'Liver Fire',
    nameId: 'Api Hati',
    definitionEn: 'Extreme heat development in the Liver/Gallbladder network, marked by explosive red eyes, dry bitter taste, severe anger fits, constipation, and a red tongue with parched yellow coat.',
    definitionId: 'Kondisi panas berlebih yang agresif pada meridian Hati, ditandai mata merah menyala, mulut terasa pahit, ledakan kemarahan, sembelit parah, serta lidah merah dengan selaput kering kekuningan.'
  },
  {
    id: 'heart_fire',
    terms: ['Heart Fire', 'Api Jantung', 'Heart Fire Burning'],
    nameEn: 'Heart Fire',
    nameId: 'Api Jantung',
    definitionEn: 'Hyperactive metabolic/mental heat in the Heart, causing deep anxiety, sleep talking, tongue ulcers/sores, mental restlessness, and reddish dark urine.',
    definitionId: 'Kondisi hiperaktivitas panas pada Jantung, memicu kecemasan yang mendalam, mimpi buruk/meracau, luka sariawan pada ujung lidah, kegelisahan batin, serta urin pekat kemerahan.'
  },
  {
    id: 'qi_deficiency',
    terms: ['Qi Deficiency', 'Defisiensi Qi', 'Defisit Qi'],
    nameEn: 'Qi Deficiency',
    nameId: 'Defisiensi Qi',
    definitionEn: 'A general depletion of the body\'s vital functional energy, presenting with shortness of breath, spontaneous sweating on light movement, soft low voice, and easy fatigue.',
    definitionId: 'Kekurangan daya hidup atau energi fungsional tubuh secara umum, ditandai sering kehabisan napas/engah-engah, mudah berkeringat meski hanya gerak ringan, suara pelan, dan letih.'
  },
  {
    id: 'yin_deficiency',
    terms: ['Yin Deficiency', 'Defisiensi Yin', 'Defisit Yin'],
    nameEn: 'Yin Deficiency',
    nameId: 'Defisiensi Yin',
    definitionEn: 'Insufficiency of cooling, moistening, and calming substrates of the organs, generating relative heat, dry membranes, warm sensations, and flushed cheeks.',
    definitionId: 'Ketidakcukupan zat pendingin, pelumas, dan pembawa ketenangan dalam sel-sel tubuh, memicu timbulnya rasa panas semu, kulit/selaput kering, rasa gerah di malam hari, dan pipi kemerahan.'
  },
  {
    id: 'yang_deficiency',
    terms: ['Yang Deficiency', 'Defisiensi Yang', 'Defisit Yang'],
    nameEn: 'Yang Deficiency',
    nameId: 'Defisiensi Yang',
    definitionEn: 'Deficiency in the warm, metabolically active, and kinetic aspect of the body, leaving the patient continually cold, sluggish, and producing pale, fluid excretions.',
    definitionId: 'Ketidakcukupan aspek penghangat, pendorong, dan dinamis di dalam organ, sehingga penderita selalu merasa kedinginan, lambat bergerak, dan cairan sekresi tubuh cenderung melimpah jernih.'
  },
  {
    id: 'moxibustion',
    terms: ['Moxibustion', 'Moksibusi', 'Moxa'],
    nameEn: 'Moxibustion',
    nameId: 'Moksibusi',
    definitionEn: 'A TCM warming therapy where dried mugwort herb (moxa) is burned near or on acupoints to warm meridians, expel cold pathogens, and activate Qi/Blood flow.',
    definitionId: 'Terapi pemanasan khas TCM di mana herbal Mugwort (moxa) dikeringkan lalu dibakar dekat atau di atas titik akupunktur guna menghangatkan meridian, mengusir dingin, dan memperlancar Qi/Darah.'
  },
  {
    id: 'meridian',
    terms: ['Meridian', 'Jalur Meridian', 'Meridian-Meridian'],
    nameEn: 'Meridian',
    nameId: 'Meridian',
    definitionEn: 'A mapped channel network in the body through which Qi, Blood, and Essence circulate to connect all internal organs and external tissues.',
    definitionId: 'Jaringan saluran energi tak kasat mata di dalam tubuh yang dilewati oleh aliran Qi, Darah, dan Esensi untuk menghubungkan organ dalam dengan seluruh jaringan permukaan tubuh.'
  },
  {
    id: 'acupoint',
    terms: ['Acupoint', 'Titik Akupunktur', 'Acupoints', 'Acupuncture Points'],
    nameEn: 'Acupoint',
    nameId: 'Titik Akupunktur',
    definitionEn: 'Specific locations on the body meridian pathways where internal Qi can be directly accessed, stimulated, and regulated via needles, finger pressure, or heat.',
    definitionId: 'Titik-titik presisi pada jalur meridian tubuh di mana energi vital (Qi) luar-dalam dapat diakses, dirangsang, dan diselaraskan melalui jarum akupunktur, pijatan, atau terapi moxa.'
  },
  {
    id: 'wei_qi',
    terms: ['Defensive Qi', 'Wei Qi', 'Qi Pertahanan'],
    nameEn: 'Defensive Qi (Wei Qi)',
    nameId: 'Wei Qi (Qi Pertahanan)',
    definitionEn: 'The fierce, protective energy that circulates on the outer boundary of muscle and skin to guard the body against external environmental pathogen invasions.',
    definitionId: 'Energi perlindung agresif yang mengalir cepat di bagian permukaan kulit dan otot luar, menyaring dan menghalau invasi faktor cuaca ekstrem (patogen luar) agar tidak masuk ke organ.'
  },
  {
    id: 'jing',
    terms: ['Jing', 'Essence', 'Esensi Ginjal', 'Vital Essence'],
    nameEn: 'Jing (Essence)',
    nameId: 'Jing (Esensi Vital)',
    definitionEn: 'The dense prenatal and postnatal ancestral essence stored in the Kidneys that determines original physical constitution, growth milestones, and longevity.',
    definitionId: 'Zat esensi dasar yang diwariskan orang tua serta disintesis dari makanan, disimpan di Ginjal, berperan penting pada siklus tumbuh kembang, kekuatan tulang, dan penuaan alami.'
  },
  {
    id: 'shen',
    terms: ['Shen', 'Spirit', 'Shen (Mind/Spirit)', 'Mind'],
    nameEn: 'Shen (Spirit/Mind)',
    nameId: 'Shen (Jiwa/Pikiran)',
    definitionEn: 'The complex mental, emotional, and spiritual awareness seated in the Heart, manifesting externally in bright eye luster, alert mind, and smooth speech.',
    definitionId: 'Kesadaran batin, kestabilan emosi, dan kilau mental yang bernaung di dalam Jantung, tercermin dari sinar mata yang jernih, pikiran tajam fokus, dan tutur kata teratur.'
  },
  {
    id: 'sanjiao',
    terms: ['Triple Burner', 'Sanjiao', 'San Jiao', 'Triple Energizer'],
    nameEn: 'Triple Burner (Sanjiao)',
    nameId: 'Triple Burner (Sanjiao)',
    definitionEn: 'A conceptual organ system in TCM divided into three compartments (Upper, Middle, Lower) coordinating water passageways and general thermal coordination.',
    definitionId: 'Sistem organ fungsional konseptual TCM yang membagi rongga tubuh menjadi tiga ruang (Atas, Tengah, Bawah) untuk mendistribusikan energi vital, makanan, dan kelancaran jalur air.'
  },
  {
    id: 'qi',
    terms: ['Qi', 'Chi', 'Vital Energy'],
    nameEn: 'Qi',
    nameId: 'Qi (Daya Hidup)',
    definitionEn: 'The vital force, metabolic energy, active impulse, or breath of life that animates and drives all dynamic transformations inside any living organism.',
    definitionId: 'Daya hidup mikro, energi metabolisme aktif, atau hembusan udara penopang kehidupan yang mengalir konstan dan mendorong segala bentuk aktivitas fisik maupun emosi dalam tubuh.'
  },
  {
    id: 'yin',
    terms: ['Yin'],
    nameEn: 'Yin',
    nameId: 'Yin',
    definitionEn: 'The cool, moistening, quiet, dark, grounding, and physical material aspect of nature and the body, balancing the hyper-activity of Yang.',
    definitionId: 'Aspek penyeimbang alam semesta dan tubuh yang bersifat dingin, lembap, tenang, gelap, substansial, pasif, dan mengakar, menetralisir keaktifan energi Yang.'
  },
  {
    id: 'yang',
    terms: ['Yang'],
    nameEn: 'Yang',
    nameId: 'Yang',
    definitionEn: 'The warm, kinetic, dry, active, bright, and transforming aspect of nature and the body, balancing the stillness of Yin.',
    definitionId: 'Aspek penyeimbang alam semesta dan tubuh yang bersifat hangat, bergerak penuh energi, kering, terang, aktif, dan bertransformasi cepat, mengimbangi keheningan energi Yin.'
  }
];

// Helper to escape string for regex safely
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generate the master regex compilation
// We sort matching terms by length descending to make sure longer terms match first before their substrings!
const allTermDefinitions: { stringToMatch: string; item: GlossaryItem }[] = [];

TCM_GLOSSARY.forEach(item => {
  item.terms.forEach(term => {
    allTermDefinitions.push({
      stringToMatch: term,
      item
    });
  });
});

// Sort by length of term descending
allTermDefinitions.sort((a, b) => b.stringToMatch.length - a.stringToMatch.length);

// Escape each and join to form a master capturing group
const patternParts = allTermDefinitions.map(def => escapeRegExp(def.stringToMatch));
const regexPattern = `\\b(${patternParts.join('|')})\\b`;

interface TcmGlossaryTooltipProps {
  text: string;
  language: Language;
}

export const TcmGlossaryTooltip: React.FC<TcmGlossaryTooltipProps> = ({ text, language }) => {
  if (!text) return null;

  try {
    const rx = new RegExp(regexPattern, 'gi');
    const parts = text.split(rx);
    if (parts.length <= 1) {
      return <>{text}</>;
    }

    // We need to keep track of matched capture chunks
    // Because regex has a single parenthesis, split(rx) returns:
    // [text_before, match1, text_between, match2, text_after...]
    return (
      <>
        {parts.map((part, index) => {
          // Odd indices in the split result correspond to matches in the capturing group
          if (index % 2 === 1) {
            // Find the definition item that corresponds to this string (case-insensitive)
            const matchTextLower = part.toLowerCase();
            const defRecord = allTermDefinitions.find(
              def => def.stringToMatch.toLowerCase() === matchTextLower
            );

            if (defRecord) {
              const item = defRecord.item;
              const isEn = language === Language.ENGLISH;
              const title = isEn ? item.nameEn : item.nameId;
              const definition = isEn ? item.definitionEn : item.definitionId;

              return (
                <span key={index} className="group relative inline-block">
                  <span className="cursor-help font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 hover:text-indigo-900 border-b-2 border-dashed border-indigo-400 rounded px-1.5 py-0.5 ml-1 mr-1 transition-all duration-200 shadow-sm leading-none inline-flex items-center">
                    {part}
                  </span>
                  
                  {/* Tooltip Popup Bubble */}
                  <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-purple-500/20 text-xs leading-normal z-50 pointer-events-none transform scale-95 group-hover:scale-100 origin-bottom">
                    <span className="block font-black text-[10px] text-teal-400 uppercase tracking-widest mb-1.5 border-b border-white/5 pb-1 select-none">
                      TCM GLOSSARY: {title}
                    </span>
                    <span className="block text-slate-200 font-medium font-sans leading-relaxed text-[11px] select-none text-left">
                      {definition}
                    </span>
                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[6px] border-transparent border-t-slate-900 z-50" />
                  </span>
                </span>
              );
            }
          }
          return <React.Fragment key={index}>{part}</React.Fragment>;
        })}
      </>
    );
  } catch (err) {
    console.error('Glossary regex err:', err);
    return <>{text}</>;
  }
};
