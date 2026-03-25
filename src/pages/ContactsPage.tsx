import React from 'react';
import { type Language, type Character } from '@/types';
import { Heart, BookOpen, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const AFFILIATION_I18N: Record<string, { zh: string; ja: string; en: string }> = {
  'Hakurei Shrine': { zh: '博丽神社', ja: '博麗神社', en: 'Hakurei Shrine' },
  'Forest of Magic': { zh: '魔法之森', ja: '魔法の森', en: 'Forest of Magic' },
  'Scarlet Devil Mansion': { zh: '红魔馆', ja: '紅魔館', en: 'Scarlet Devil Mansion' },
  Hakugyokurou: { zh: '白玉楼', ja: '白玉楼', en: 'Hakugyokurou' },
  Eientei: { zh: '永远亭', ja: '永遠亭', en: 'Eientei' },
  'Moriya Shrine': { zh: '守矢神社', ja: '守矢神社', en: 'Moriya Shrine' },
  Chireiden: { zh: '地灵殿', ja: '地霊殿', en: 'Chireiden' },
  Other: { zh: '其他', ja: 'その他', en: 'Other' },
};

function getAffiliationLabel(affiliation: string, language: Language): string {
  return AFFILIATION_I18N[affiliation]?.[language] ?? affiliation;
}

interface ContactsPageProps {
  language: Language;
  characters: Character[];
}

export const ContactsPage: React.FC<ContactsPageProps> = ({ language, characters }) => {
  const affiliations = Array.from(new Set(characters.map(c => c.affiliation || 'Other')));

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tighter text-cream-text">
          {language === 'zh' ? '通讯录' : language === 'ja' ? '連絡先' : 'Contacts'}
        </h1>
        <p className="text-xs opacity-50 font-bold uppercase tracking-widest mt-1">Fumo Collection</p>
      </header>

      <div className="space-y-6">
        {affiliations.map(affiliation => (
          <section key={affiliation}>
            <h2 className="text-xs font-black opacity-30 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <Star className="w-3 h-3" />
              {getAffiliationLabel(affiliation, language)}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {characters.filter(c => (c.affiliation || 'Other') === affiliation).map(fumo => (
                <Link 
                  key={fumo.id} 
                  to={`/chat/${fumo.id}`}
                  className="stitched-card flex items-center gap-4 hover:translate-y-[-2px] transition-transform active:scale-95 block"
                >
                  <div className="relative">
                    <img src={fumo.avatar} className="w-14 h-14 rounded-full border-2 border-white fumo-shadow object-cover" alt="" />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full ${fumo.isOnline ? 'bg-green-400' : 'bg-gray-300'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{fumo.name[language]}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
                        <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                        Lv.{fumo.bondLevel}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
                        <BookOpen className="w-3 h-3" />
                        {fumo.photoCount || 0} {language === 'zh' ? '照片' : language === 'ja' ? '写真' : 'Photos'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
