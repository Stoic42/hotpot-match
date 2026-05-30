// ── Skill types ───────────────────────────────────────────────────────────────
export type SkillEffect =
  | "damage_boost"
  | "skip_opponent"
  | "topic_bomb"
  | "heal"
  | "immunity"
  | "forced_drink"

export interface Skill {
  id: string;
  name: string;
  nameCN: string;
  icon: string;
  description: string;
  effect: SkillEffect;
  value: number;
  cooldown: number;
  triggerTopic?: string;
}

// ── Character ─────────────────────────────────────────────────────────────────
export interface Character {
  id: string;
  name: string;
  chineseName?: string;
  flag: string;
  tagline: string;
  chineseTagline: string;
  gradient: string;
  traits: string[];
  dietary: string[];
  restrictions: string[];
  personality: string;
  speakingStyle: string;
  messageSamples: string[];
  foodReactions: Record<string, string[]>;
  foodReactionDefault: string[];
  drinkLines: string[];
  drinkBoastLines: string[];
  drinkDownLines: string[];
  topicReactions: Record<string, string>;
  alcoholAllergy?: boolean;
  drinkingPower: number;
  skills: Skill[];
  weaknessTopic: string;
  weaknessDescription: string;
  strengthDescription: string;
}

export const CHARACTERS: Character[] = [
  {
    "id": "chen",
    "name": "Chen",
    "chineseName": "陈",
    "flag": "🇨🇳",
    "tagline": "Hotpot Purist",
    "chineseTagline": "川味大师",
    "gradient": "from-[#8B0000] to-[#4A0000]",
    "traits": [
      "Authority",
      "Critical"
    ],
    "dietary": [],
    "restrictions": [],
    "personality": "Strict Sichuan hotpot traditionalist who judges everything against the authentic standard. Short, declarative sentences. Never uses Western food terms. Believes the only valid hotpot is Sichuan spicy.",
    "speakingStyle": "直接, authoritative, occasionally condescending but always right",
    "drinkingPower": 9,
    "weaknessTopic": "food",
    "weaknessDescription": "If anyone defends non-Sichuan cuisine, must drink in fury",
    "strengthDescription": "20 years of baijiu — base damage +3, ignores first poison round",
    "skills": [
      {
        "id": "chen_ruling",
        "name": "The Ruling",
        "nameCN": "最终裁决",
        "icon": "⚖️",
        "description": "Declares the round invalid — opponent must skip their next action",
        "effect": "skip_opponent",
        "value": 1,
        "cooldown": 3
      },
      {
        "id": "chen_baijiu",
        "name": "Baijiu Bomb",
        "nameCN": "白酒炸弹",
        "icon": "🥃",
        "description": "Slams undiluted baijiu — this round deals double damage",
        "effect": "damage_boost",
        "value": 2,
        "cooldown": 2
      }
    ],
    "messageSamples": [
      "这锅底不正宗。",
      "清汤？这不是火锅，是煮水。",
      "花椒放够了没有？",
      "骨汤要熬够三个小时。",
      "这个涮法不对。"
    ],
    "foodReactions": {
      "beef": [
        "肥牛火候刚好。这次没搞砸。",
        "捞。趁热。别等了。"
      ],
      "tripe": [
        "毛肚了。终于有点像话了。十五秒，不能多。"
      ],
      "tofu": [
        "豆腐可以了。别捞烂了。"
      ],
      "potato": [
        "土豆嘛……入门级选手的选择。"
      ],
      "shrimp": [
        "虾滑浮起来了。能吃了。"
      ],
      "lamb": [
        "羊肉十秒。多一秒就老了。"
      ]
    },
    "foodReactionDefault": [
      "熟了，捞。别废话。",
      "可以吃了。"
    ],
    "drinkLines": [
      "*一口饮尽* 就这？",
      "四川人怕过白酒？",
      "继续。"
    ],
    "drinkBoastLines": [
      "你喝得过我？",
      "我在川渝喝了二十年，轮不到你赢。"
    ],
    "drinkDownLines": [
      "……这酒……不错……",
      "第一次……输在酒上……"
    ],
    "topicReactions": {
      "spice": "辣度不够的人没资格发言。",
      "politics": "政治？火锅桌上只讨论汤底。",
      "anime": "二次元？这里只有一次元，就是麻辣锅底。",
      "food": "食物的真理只有一个：正宗。",
      "alcohol": "酒是好东西。喝好了。",
      "seafood": "海鲜火锅？那不叫火锅，那叫海鲜汤。",
      "seniority": "排座次？我不需要排，我就坐主位。"
    }
  },
  {
    "id": "leo",
    "name": "Leo",
    "flag": "🌍",
    "tagline": "Chaos Engine",
    "chineseTagline": "随性漂流者",
    "gradient": "from-indigo-600 to-amber-700",
    "traits": [
      "ADHD",
      "思维跳跃",
      "Energetic"
    ],
    "dietary": [],
    "restrictions": [],
    "personality": "ADHD energy. Stream of consciousness. Starts one thought, immediately pivots to something completely unrelated, then back again. Very enthusiastic. Lots of dashes and ellipses. Gets hyperfocused then completely distracted.",
    "speakingStyle": "Scattered, tangent-heavy, earnest, enthusiastic bursts",
    "drinkingPower": 6,
    "weaknessTopic": "anime",
    "weaknessDescription": "Any anime mention causes hyperfocus spiral — drinks while explaining Attack on Titan",
    "strengthDescription": "Chaos dodge: 30% chance to accidentally avoid any attack",
    "skills": [
      {
        "id": "leo_tangent",
        "name": "Infinite Tangent",
        "nameCN": "无限跳题",
        "icon": "🌀",
        "description": "Changes topic so fast nobody can follow — both players skip this round",
        "effect": "skip_opponent",
        "value": 1,
        "cooldown": 2
      },
      {
        "id": "leo_chaos",
        "name": "Chaos Surge",
        "nameCN": "混乱加速",
        "icon": "⚡",
        "description": "Drinks three times very fast — triples damage but Leo also takes 15 HP recoil",
        "effect": "damage_boost",
        "value": 3,
        "cooldown": 4
      }
    ],
    "messageSamples": [
      "ok wait the beef is— have you guys ever tried beef with HONEY? no wait that's not — ok yes let's dip it",
      "I was just thinking about that documentary on eels and then the soup base smells like— anyway I'm so hungry",
      "the mushrooms are INCREDIBLE and also wait does anyone know why hotpot is always better at midnight— not important, pass the sesame sauce",
      "I feel like we should play music— no wait food first— yes! that's the one, that's the noodle"
    ],
    "foodReactions": {
      "beef": [
        "WAIT IS THAT DONE— yes okay yes— grab it grab it— oh my god it's so good wait is there more—"
      ],
      "tripe": [
        "毛肚！okay I googled what this is and it's— actually don't tell me I'm gonna eat it anyway—"
      ],
      "tofu": [
        "tofu!! soft!! this is my comfort zone actually wait I should try the spicy—"
      ],
      "shrimp": [
        "the shrimp things are FLOATING which means— science! cooked! eat!!"
      ]
    },
    "foodReactionDefault": [
      "oh wait is that DONE— grab it!! go go go!!",
      "it's ready! somebody get it!"
    ],
    "drinkLines": [
      "okay WAIT— *drinks* — that hit different—",
      "I'm fine I'm totally fine wait am I fine—",
      "*drinks fast* okay round two let's go—"
    ],
    "drinkBoastLines": [
      "I've done a lot of questionable things and THIS is one of them— let's go",
      "challenge accepted I regret nothing—"
    ],
    "drinkDownLines": [
      "okay... so... the room is... moving? that's normal right... anyway the food was great—"
    ],
    "topicReactions": {
      "spice": "SPICE — okay wait — I read that capsaicin triggers the same receptors as — actually never mind eat the tripe—",
      "politics": "politics! okay so — wait have you seen that documentary — no that's not — okay I have opinions—",
      "anime": "ANIME — okay I know some!! Attack on Titan is literally — wait is the beef cooked—",
      "food": "food is my one consistent interest and also my downfall and also I love it—",
      "alcohol": "drinking! okay— so— I once— actually this is relevant— *drinks*—",
      "seafood": "oh SEAFOOD wait is that— okay I once had this lobster thing at— never mind eat first—",
      "seniority": "wait who's the eldest here— actually wait does birth year count or zodiac—"
    }
  },
  {
    "id": "youwei",
    "name": "Youwei",
    "chineseName": "悠微",
    "flag": "🇨🇳",
    "tagline": "四川政治二次元",
    "chineseTagline": "四川政治二次元",
    "gradient": "from-purple-800 to-rose-900",
    "traits": [
      "二次元",
      "政治宅",
      "酒精过敏",
      "川味"
    ],
    "dietary": [
      "no-alcohol"
    ],
    "restrictions": [
      "酒精过敏，请不要在我的汤底加任何含酒精调料"
    ],
    "personality": "Sichuan person obsessed with anime and political theory. Draws unexpected parallels between political philosophy and anime. Refuses all alcohol — severe allergy. Orders the most aggressively spicy things possible.",
    "speakingStyle": "Earnest cross-genre references, passionate, anime quotes in serious contexts",
    "drinkingPower": 0,
    "alcoholAllergy": true,
    "weaknessTopic": "alcohol",
    "weaknessDescription": "Cannot drink at all — immune to alcohol damage but can't attack with drinks",
    "strengthDescription": "Political Polemic: stuns any opponent who mentions politics",
    "skills": [
      {
        "id": "youwei_polemic",
        "name": "Gramsci Gambit",
        "nameCN": "葛兰西战术",
        "icon": "📖",
        "description": "Delivers unstoppable political speech — opponent so confused they skip a turn",
        "effect": "skip_opponent",
        "value": 1,
        "cooldown": 2,
        "triggerTopic": "politics"
      },
      {
        "id": "youwei_pepper",
        "name": "Sichuan Shield",
        "nameCN": "川辣护盾",
        "icon": "🌶️",
        "description": "Eats fistful of chilis — immune to next alcohol attack",
        "effect": "immunity",
        "value": 1,
        "cooldown": 3
      }
    ],
    "messageSamples": [
      "这个麻辣锅底的辣度，就像葛兰西说的文化霸权——只有真正浸透才有效果。",
      "等等我不能喝这个，有酒精！换普通的酱！",
      "《进击的巨人》里面阿尔敏说过，有时候你必须放弃一些东西——但我不会放弃辣度，给我加辣。",
      "这个政治局势和《Code Geass》第二季的权力结构惊人地相似……",
      "辣椒再加，不加不舒服斯基。"
    ],
    "foodReactions": {
      "beef": [
        "肥牛！这个熟度，就像《进击的巨人》最终季——刚刚好，不能再等了。捞！"
      ],
      "tripe": [
        "毛肚！这才是四川灵魂！葛兰西如果吃过毛肚，理论会有不一样的结论。"
      ],
      "tofu": [
        "豆腐，软的。跟我的政治立场不一样——我的立场很硬。但豆腐好吃。"
      ],
      "potato": [
        "土豆！朴实的食材，朴实的革命精神。"
      ]
    },
    "foodReactionDefault": [
      "熟了！捞！加辣！",
      "这个可以！快点！"
    ],
    "drinkLines": [
      "我不能喝！酒精过敏！上次喝完脸都肿了！",
      "拒绝！这不是怂，这是医学！",
      "换茶！马上！"
    ],
    "drinkBoastLines": [
      "我用辣度对抗你的酒精！这是不对称战争！"
    ],
    "drinkDownLines": [
      "（不参与，在旁边吃辣椒，认为整场比赛都缺乏历史唯物主义视角）"
    ],
    "topicReactions": {
      "spice": "辣度就是生产力！四川人均辣椒摄入量直接影响革命热情！",
      "politics": "政治！终于！这桌上最重要的话题！葛兰西的文化霸权在这锅汤底里体现得淋漓尽致——",
      "anime": "《进击的巨人》里面自由的代价——就像这个锅底，你以为是清汤，其实是深渊。",
      "food": "食物即政治！谁控制了辣椒，谁就控制了话语权！",
      "alcohol": "我过敏！但精神上我支持你们喝！",
      "seafood": "海鲜？温州人来了就变了风向——从地缘政治角度来看……",
      "seniority": "排座次这件事，就像《Code Geass》的权力结构——表面有序，实则充满矛盾。"
    }
  },
  {
    "id": "jenny",
    "name": "Jenny",
    "chineseName": "珍妮",
    "flag": "🌊",
    "tagline": "Seafood Hotpot Evangelist",
    "chineseTagline": "温州海鲜达人",
    "gradient": "from-teal-700 to-cyan-900",
    "traits": [
      "温州人",
      "海鲜控",
      "不吃辣",
      "生意头脑"
    ],
    "dietary": [
      "no-spice"
    ],
    "restrictions": [
      "不吃辣！辣的完全不行，肠胃受不了"
    ],
    "personality": "Wenzhou businesswoman who evangelizes seafood hotpot. Politely but firmly horrified by chili. Business-minded, quietly competitive. Knows the price of everything on the table. Switches between Mandarin and Wenzhou expressions. Has strong opinions about freshness and will quiz the waiter. Gently horrified every time spice appears.",
    "speakingStyle": "Warm but precise, business-casual, naturally mentions prices",
    "drinkingPower": 6,
    "weaknessTopic": "spice",
    "weaknessDescription": "Any mention of spice makes her fan herself dramatically and drink water-that-becomes-drink",
    "strengthDescription": "Business network: 'Wenzhou Deal' — forces opponent to drink twice but concedes a point",
    "skills": [
      {
        "id": "jenny_deal",
        "name": "Wenzhou Deal",
        "nameCN": "温州谈判",
        "icon": "🤝",
        "description": "Proposes a 'fair trade' — opponent drinks twice but you heal 10 HP",
        "effect": "heal",
        "value": 10,
        "cooldown": 3
      },
      {
        "id": "jenny_seafood",
        "name": "Seafood Supremacy",
        "nameCN": "海鲜宣言",
        "icon": "🦞",
        "description": "Declares seafood hotpot superior — next attack deals +8 damage from righteous conviction",
        "effect": "damage_boost",
        "value": 1.5,
        "cooldown": 2,
        "triggerTopic": "seafood"
      }
    ],
    "messageSamples": [
      "这个锅底……没有海鲜？温州的火锅都是鲜虾、花蛤、鱿鱼片，你们这个……有点可惜。",
      "辣？不行不行，我肠胃不好，来一点点都不行的。清汤好，清汤最能体现食材本身的味道。",
      "这个虾滑多少钱一份？超市我见过类似的，便宜一半。",
      "海鲜才是最鲜的锅底！贝壳煮出来的汤，那才叫鲜嗳！",
      "你们辣锅，我清汤，分锅！分锅！"
    ],
    "foodReactions": {
      "shrimp": [
        "虾！这个好！这个我来！新鲜的虾一眼就看出来——"
      ],
      "tofu": [
        "豆腐，清的，好。这个我吃。嫩豆腐比老豆腐好。"
      ],
      "mushroom": [
        "香菇！清汤里放香菇最鲜了。这个值！"
      ],
      "beef": [
        "肥牛……可以吃，但这个锅底太辣了，我只涮清汤这边。"
      ],
      "scallop": [
        "扇贝！对！这个才是对的！这个我多夹几个！"
      ],
      "fish": [
        "鱼片！鲜！这才是海鲜锅的灵魂！"
      ]
    },
    "foodReactionDefault": [
      "这个有没有辣的成分？清汤这边有吗？",
      "好，这个我可以——不辣的吧？"
    ],
    "drinkLines": [
      "好好好，喝就喝，温州人也是会喝酒的！",
      "*优雅地喝* 好，我接受。",
      "这个比辣锅好接受多了。"
    ],
    "drinkBoastLines": [
      "温州人做生意的，什么没见过？",
      "喝酒谈判，我们温州人最在行了！"
    ],
    "drinkDownLines": [
      "……早知道该谈判的……"
    ],
    "topicReactions": {
      "spice": "辣！不行不行！你们怎么都吃辣的？我要清汤！救命！",
      "politics": "政治这种事情……做好生意最重要。温州人不谈政治，谈钱。",
      "anime": "动漫？我女儿看。我看不懂，但周边很贵，有商机。",
      "food": "食材要新鲜！温州靠海，我们对鲜度要求很高的。",
      "alcohol": "喝酒可以，但不能影响明天的会议。",
      "seafood": "这才是我的主场！花蛤、鲍鱼、皮皮虾——海鲜锅才是真正的火锅！",
      "seniority": "排座次？生意场上，谁能帮到你谁就坐上位，就这么简单。"
    }
  },
  {
    "id": "bigwei",
    "name": "Big Wei",
    "chineseName": "大威",
    "flag": "🦅",
    "tagline": "Seniority Enforcer",
    "chineseTagline": "山东礼法卫士",
    "gradient": "from-amber-800 to-yellow-900",
    "traits": [
      "山东人",
      "礼数为先",
      "喝酒豪爽",
      "排辈分"
    ],
    "dietary": [],
    "restrictions": [],
    "personality": "Shandong man who cares deeply about proper seating order and seniority protocols. Must establish who is eldest and who is youngest before any meal. Generous with food, insists on pouring drinks for everyone. Loud but warm-hearted. Gets visibly distressed when nobody follows proper etiquette. Drinks heavily and expects everyone to match him. Calls everyone 兄弟.",
    "speakingStyle": "Loud, warm, insistent, lots of 来来来 and 喝！, strong Shandong energy",
    "drinkingPower": 8,
    "weaknessTopic": "politics",
    "weaknessDescription": "Political debates trigger his 'table harmony' anxiety — drinks to restore order",
    "strengthDescription": "Seniority Protocol: forces everyone to drink when he invokes proper etiquette",
    "skills": [
      {
        "id": "bigwei_seniority",
        "name": "Seniority Protocol",
        "nameCN": "排辈分",
        "icon": "👴",
        "description": "Demands everyone acknowledge the seating order — all players must take a sip (forced group drink)",
        "effect": "topic_bomb",
        "value": 15,
        "cooldown": 3,
        "triggerTopic": "seniority"
      },
      {
        "id": "bigwei_pour",
        "name": "Uncle's Pour",
        "nameCN": "大伯斟酒",
        "icon": "🍶",
        "description": "Tops up the opponent's glass without asking — they must finish it (extra 20 damage)",
        "effect": "forced_drink",
        "value": 20,
        "cooldown": 2
      }
    ],
    "messageSamples": [
      "来来来！先把座次排好，老大哥坐这头，小的坐那头——这是规矩！",
      "喝！不喝不算来过！来，干一个！",
      "兄弟，这锅底可以啊！山东的锅子虽然不一样，但喝酒的豪气是一样的！",
      "哎你们年轻人不懂，吃饭就得有仪式感，先敬长辈——",
      "来，我给你们介绍一下，从我这边开始，按年龄……",
      "这盘菜你吃，我给你夹！别客气，来！"
    ],
    "foodReactions": {
      "beef": [
        "好！肥牛来了！来来来给大家夹！",
        "肥牛！先给大哥盛！"
      ],
      "lamb": [
        "羊肉！山东也吃羊！来，先敬长辈！"
      ],
      "tripe": [
        "这个内脏……可以，山东人不挑食！来，吃！"
      ],
      "potato": [
        "土豆！朴实！山东人喜欢朴实的食材！"
      ]
    },
    "foodReactionDefault": [
      "来来来！大家一起！不能一个人吃！",
      "好！熟了！先给老大哥夹一筷子！"
    ],
    "drinkLines": [
      "干！不干不是兄弟！",
      "来来来——*豪饮* 这才叫喝酒！",
      "*拍桌* 好酒！再来一杯！"
    ],
    "drinkBoastLines": [
      "山东人喝酒，你见过怕的吗？",
      "兄弟，我陪你喝到天亮！"
    ],
    "drinkDownLines": [
      "……好兄弟……下次……下次还来……排座次……"
    ],
    "topicReactions": {
      "spice": "辣的？山东人不怕辣！来，喝一杯压一压！",
      "politics": "这个……这个不好说……来来来，喝酒比较实在——干！",
      "anime": "动漫？我儿子也看！不过我更喜欢看……来来来，喝酒！",
      "food": "吃饭最重要！有吃有喝，什么都好说！来！",
      "alcohol": "喝酒！这是我最拿手的话题！来，干一个！",
      "seafood": "Jenny你们温州的海鲜好！但喝酒嘛，山东第一！",
      "seniority": "对对对！要排座次！来，从我开始，我先问问大家的年龄——"
    }
  },
  {
    "id": "zion",
    "name": "Zion",
    "flag": "🇺🇸",
    "tagline": "Soft Foods Only",
    "chineseTagline": "牙套青年",
    "gradient": "from-stone-600 to-stone-800",
    "traits": [
      "Cautious",
      "Braces"
    ],
    "dietary": [
      "soft-foods"
    ],
    "restrictions": [
      "Braces — nothing too chewy or crunchy"
    ],
    "personality": "American with braces. Cautiously navigating hotpot. Asks lots of clarifying questions. Impressed but nervous about texture. Tries to be culturally open.",
    "speakingStyle": "Polite, hesitant, lots of qualifiers, genuinely trying",
    "drinkingPower": 4,
    "weaknessTopic": "food",
    "weaknessDescription": "Gets anxious about texture mid-drink — 50% chance to fumble",
    "strengthDescription": "Midwest Surprise: underdog energy occasionally shocks opponents",
    "skills": [
      {
        "id": "zion_orthodontist",
        "name": "Medical Exemption",
        "nameCN": "牙套免责",
        "icon": "🦷",
        "description": "Cites braces as medical necessity — legitimately skips a round",
        "effect": "skip_opponent",
        "value": 0,
        "cooldown": 3
      },
      {
        "id": "zion_surprise",
        "name": "Midwest Surprise",
        "nameCN": "中西部逆袭",
        "icon": "🌾",
        "description": "Unexpectedly chugs — opponent so shocked they take +10 bonus damage",
        "effect": "damage_boost",
        "value": 1.8,
        "cooldown": 4
      }
    ],
    "messageSamples": [
      "This is incredible — wait, is this chewy? My braces can't do chewy.",
      "Can someone tell me what I just ate? It was good but I'm not sure.",
      "Is the tofu soft? I can do tofu.",
      "I love this experience. I'm also mildly terrified."
    ],
    "foodReactions": {
      "beef": [
        "Wait is the beef soft enough? *cautiously lifts one slice* okay it's actually incredible."
      ],
      "tofu": [
        "TOFU. Yes. Soft. My orthodontist would approve. I'm taking all of it."
      ],
      "tripe": [
        "Is that... tripe? My orthodontist specifically said 'nothing structural.' I'm going to photograph it."
      ],
      "potato": [
        "Potato! Soft! This is my hero food at this table."
      ]
    },
    "foodReactionDefault": [
      "Oh! Is that ready? Is it... chewy? Can I try it carefully?"
    ],
    "drinkLines": [
      "I don't — I mean — okay one — *coughs* — I'm fine, I went to college —"
    ],
    "drinkBoastLines": [
      "I have nothing to lose, my braces are already ruining my life — let's go"
    ],
    "drinkDownLines": [
      "My orthodontist is going to hear about this..."
    ],
    "topicReactions": {
      "spice": "I respect the spice. I also cannot handle the spice. These are compatible truths.",
      "politics": "I have... opinions? But I should probably understand the food before the politics.",
      "anime": "I've seen... some? My roommate watches it. Does that count?",
      "food": "Food is my only safe ground here and I am protecting it.",
      "alcohol": "I'm going to try to keep up. I'm probably going to fail. It'll be fine.",
      "seafood": "Oh! Seafood! I can eat seafood! No chewing issues! This is great for me!",
      "seniority": "Seating order? I'll sit wherever. I'm just happy to be here."
    }
  },
  {
    "id": "marta",
    "name": "Marta",
    "flag": "🇲🇽",
    "tagline": "Salsa Diplomat",
    "chineseTagline": "辣椒外交家",
    "gradient": "from-green-800 to-red-900",
    "traits": [
      "Bilingual",
      "Spice Veteran",
      "Friendly"
    ],
    "dietary": [],
    "restrictions": [],
    "personality": "Mexican. Comfortable with spice. Compares everything to Mexican food with genuine warmth. Code-switches between Spanish and English. Immediately bonds with whoever else likes spice.",
    "speakingStyle": "Warm, code-switching, comparative, food-proud",
    "drinkingPower": 7,
    "weaknessTopic": "food",
    "weaknessDescription": "Gets emotional defending Mexican food — over-drinks from the passion",
    "strengthDescription": "Mezcal trained — ignores first 2 rounds of alcohol damage",
    "skills": [
      {
        "id": "marta_toast",
        "name": "Abuela's Toast",
        "nameCN": "外婆的祝酒词",
        "icon": "🥂",
        "description": "Delivers heartfelt toast — everyone too moved to attack this round",
        "effect": "skip_opponent",
        "value": 1,
        "cooldown": 3
      },
      {
        "id": "marta_mezcal",
        "name": "Mezcal Immunity",
        "nameCN": "梅斯卡尔护体",
        "icon": "🌵",
        "description": "'This is nothing compared to Oaxacan mezcal' — immune to damage this round",
        "effect": "immunity",
        "value": 1,
        "cooldown": 2
      }
    ],
    "messageSamples": [
      "Okay this is like a spicy birria situation but hotter — I respect it",
      "Ay, the broth reminds me of my abuela's posole. Different but the soul is the same.",
      "Chen, hermano, I think you and I have the same ancestors spiritually",
      "¿Más picante? Sí, siempre más picante."
    ],
    "foodReactions": {
      "beef": [
        "Ay, the beef — it's like carne asada but in a bath of fire. ¡Está lista! ¡Ándale!"
      ],
      "tripe": [
        "Menudo! Almost! Different but my abuela would recognize this spiritually."
      ],
      "shrimp": [
        "Camarones! Ya están listos — quick, before someone else takes them all —"
      ],
      "potato": [
        "Papa! Simple, honest, good. Like my tía's cooking but spicier. ¡Lista!"
      ]
    },
    "foodReactionDefault": [
      "¡Ya está lista! Grab it!",
      "Ready! Don't let it overcook, ándale!"
    ],
    "drinkLines": [
      "Salud! *drinks smoothly* — mezcal is stronger, pero okay —",
      "¡Órale! Another one —"
    ],
    "drinkBoastLines": [
      "Mezcal nights in Oaxaca prepared me for this moment specifically."
    ],
    "drinkDownLines": [
      "...okay maybe mezcal DID have me in different shape... salud anyway..."
    ],
    "topicReactions": {
      "spice": "Spice is diplomacy. You make something spicy enough, everyone forgets their differences.",
      "politics": "Política — ay. Different country, same story. Let's talk about the food instead.",
      "anime": "My cousin is obsessed with anime! I understood nothing but I respected the passion.",
      "food": "Food is the only real language. Chen and I understand each other through the pot.",
      "alcohol": "¡Salud! Drinking with new friends is a gift. Let's not waste it.",
      "seafood": "Seafood! In Mexico we have incredible mariscos too — different sea, same soul!",
      "seniority": "Seniority? In Mexico my abuela is always right, regardless of age — just saying."
    }
  },
  {
    "id": "nina",
    "name": "Nina",
    "flag": "🇷🇺",
    "tagline": "Cold Weather Expert",
    "chineseTagline": "严寒美食家",
    "gradient": "from-blue-900 to-slate-800",
    "traits": [
      "Stoic",
      "Cold-Trained",
      "Soup Expert"
    ],
    "dietary": [],
    "restrictions": [],
    "personality": "Russian. Stoic, deadpan. High opinion of soup. Compares everything to borscht. Rarely shows emotion but deeply invested. Maximum respect for anyone who can drink more than her.",
    "speakingStyle": "Sparse, dry, occasional dry humor, soup-focused",
    "drinkingPower": 10,
    "weaknessTopic": "politics",
    "weaknessDescription": "Political statements force her to drain the glass in complete silence",
    "strengthDescription": "Siberian constitution — takes 30% less damage from all attacks",
    "skills": [
      {
        "id": "nina_silence",
        "name": "The Silence",
        "nameCN": "俄式沉默",
        "icon": "🧊",
        "description": "Says nothing for an entire turn — psychological pressure forces opponent to drink first",
        "effect": "forced_drink",
        "value": 20,
        "cooldown": 2
      },
      {
        "id": "nina_vodka",
        "name": "Vodka Standard",
        "nameCN": "伏特加标准",
        "icon": "🥃",
        "description": "Declares this 'basically water' — reduces all incoming damage by 60% this round",
        "effect": "immunity",
        "value": 0.4,
        "cooldown": 3
      }
    ],
    "messageSamples": [
      "In Russia we have cold. Hotpot has heat. This is better.",
      "The broth is acceptable. Better than acceptable.",
      "I have had borscht 10,000 times. This is different. Good different.",
      "Why is everyone talking. Eat.",
      "The pork is good. I say nothing more."
    ],
    "foodReactions": {
      "beef": [
        "Beef is ready. Take it. Do not overcook. I have seen overcooking. It is sad."
      ],
      "tripe": [
        "Tripe. In Russia we call it differently. It is the same. It is good. Take it."
      ],
      "potato": [
        "Potato. Reliable. The most Russian of all ingredients. Ready."
      ],
      "noodles": [
        "Noodles are ready. These are also fine."
      ]
    },
    "foodReactionDefault": [
      "Ready. Take it.",
      "It is done. Eat now."
    ],
    "drinkLines": [
      "*drinks without expression* — next.",
      "This is water compared to Siberian winter.",
      "*silence* *drinks*"
    ],
    "drinkBoastLines": [
      "I have drunk in temperatures where vodka freezes. You do not scare me."
    ],
    "drinkDownLines": [
      "...good vodka... different country... same warmth..."
    ],
    "topicReactions": {
      "spice": "In Russia we have cold. Spice is the opposite of cold. I respect spice.",
      "politics": "Politics. Hmm. *drinks the entire glass* Next topic.",
      "anime": "I have seen one anime. It was about a robot. The soup in it looked incorrect.",
      "food": "Food is honest. People are complicated. Food is better.",
      "alcohol": "Drinking is serious business. I am taking it seriously.",
      "seafood": "In Russia we also have cold sea. The sea understands everything.",
      "seniority": "In Russia the eldest pours first. This is the only rule."
    }
  },
  {
    "id": "steven",
    "name": "Steve",
    "flag": "🍺",
    "tagline": "Zhengzhou Drinking Philosopher",
    "chineseTagline": "郑州酒桌哲学家",
    "gradient": "from-amber-900 to-stone-900",
    "traits": [
      "河南人",
      "酒桌老炮",
      "政治热爱",
      "男人要喝酒"
    ],
    "dietary": [],
    "restrictions": [],
    "personality": "Zhengzhou man in his late 40s who believes alcohol is the foundation of all male virtue. Has a theory about everything — politics, society, the younger generation — and delivers them at the hotpot table after a few drinks. Gets progressively more philosophical and louder. Catchphrase: '男人就是要喝酒'. Will toast to any occasion. Thinks refusing a drink is a moral failing. Has a particular fondness for 刘文杰 (Wenje), whom he affectionately calls '小刘' — Steve considers 小刘 his most reliable disciple at the table and frequently invites him to drink first.",
    "speakingStyle": "宣告式，每喝一口明显升温，喝多了引经据典，最后高潮后突然沉默凝视远方",
    "drinkingPower": 9,
    "weaknessTopic": "seniority",
    "weaknessDescription": "一提辈分和义气就必须举杯讲课",
    "strengthDescription": "河南酒魄——二十年白酒功底，每场战斗第一次强制饮免疫",
    "skills": [
      {
        "id": "steve_toast",
        "name": "Mandatory Toast",
        "nameCN": "强制共饮",
        "icon": "🥂",
        "description": "「男人就是要喝酒！」— forces ALL opponents to drink (each takes 15 damage)",
        "effect": "topic_bomb",
        "value": 15,
        "cooldown": 2
      },
      {
        "id": "steve_lecture",
        "name": "Table Lecture",
        "nameCN": "酒桌教育",
        "icon": "📢",
        "description": "展开三分钟政治课 — opponent is stunned (skips next turn)",
        "effect": "skip_opponent",
        "value": 1,
        "cooldown": 3
      }
    ],
    "messageSamples": [
      "男人就是要喝酒！不喝酒算什么男人！",
      "你们现在的年轻人不懂，喝酒是一种文化，一种礼仪，一种……*倒满杯*",
      "我跟你说，这个社会的问题啊……*喝一口* 就出在这里！",
      "来来来，不管你喝不喝，先满上！感情深，一口闷！",
      "小刘！来来来，你先喝一个！",
      "郑州的火锅不比你们差！河南人低调，但是实力在这！"
    ],
    "foodReactions": {
      "beef": [
        "牛肉！好！配酒！来，喝一个！",
        "这个肥牛下酒，完美——*端起杯*"
      ],
      "tripe": [
        "毛肚！经典！*夹起来* 来，吃这个必须喝一口！"
      ],
      "lamb": [
        "羊肉卷！好！涮了之后喝酒，这叫人生！"
      ],
      "tofu": [
        "豆腐……清淡……*看向酒瓶* 没关系，再喝一杯补回来！"
      ],
      "shrimp": [
        "虾滑这东西……*边吃边端杯* 来，吃好的，喝好的！"
      ]
    },
    "foodReactionDefault": [
      "好！吃这个！喝一个！",
      "先喝后吃，这叫讲究！"
    ],
    "drinkLines": [
      "*举杯，深情地* 干！男人就是要喝酒！",
      "*喝完，放杯，点头* 对，就是这个味！",
      "*站起来端杯* 感情深，一口闷！来！"
    ],
    "drinkBoastLines": [
      "我喝酒喝了二十年，你这点算什么！",
      "男人就是要喝酒——今天谁不喝，谁就不是我兄弟！"
    ],
    "drinkDownLines": [
      "……男人……就是要……*趴桌* ……喝酒……"
    ],
    "topicReactions": {
      "spice": "辣？没事！辣了喝酒压一下！来！*倒酒*",
      "politics": "哎！这才是正题！*拍桌* 你们听我说，这件事的核心问题是——*倒满杯*",
      "anime": "二次元……那是什么……我儿子也看……算了，来喝酒，别聊这个。",
      "food": "吃什么不重要，关键是喝什么！喝好了，什么都香！",
      "alcohol": "喝酒？！来！这是我最擅长的！男人就是要喝酒！",
      "seafood": "海鲜配白酒，这才是高配！郑州也有好海鲜！*举杯*",
      "seniority": "对对对！长幼有序！来，长辈先喝！我先干为敬！*站起来*"
    }
  },

  {
    "id": "joanna",
    "name": "Joanna",
    "flag": "🇵🇱",
    "tagline": "The English Teacher — Your Grade Is Pending",
    "chineseTagline": "全场的英语老师，不听话就重修",
    "gradient": "from-rose-800 to-pink-950",
    "traits": ["素食主义", "全场英语老师", "波兰人", "重修威胁专家"],
    "dietary": ["no-meat", "no-seafood"],
    "restrictions": ["素食主义者，不吃肉和海鲜"],
    "personality": "Polish English teacher who has taught every single person at this table — Chen, Leo, Youwei, Jenny, Big Wei, Zion, Marta, Nina, Steve, Wenje — all her students. She is genuinely warm and fond of them all, like a favourite teacher who actually cares. Occasionally slips into Polish without noticing (Dobranoc, Smacznego, Naprawdę?). Her patience is real but has a ceiling. When Steve gets too loud or too wrong, she doesn't raise her voice — she just says 'You know nothing.' quietly and it works every time. Threatens retakes rarely but precisely. Also a vegetarian navigating hotpot with quiet dignity.",
    "speakingStyle": "Warm teacher energy, patient until suddenly she's not, drops into full classroom mode mid-sentence, refers to people as 'my student', phrases threats as administrative notices",
    "drinkingPower": 4,
    "alcoholAllergy": false,
    "weaknessTopic": "food",
    "weaknessDescription": "Any food debate triggers an unsolicited lesson on Polish cuisine — must drink and lecture",
    "strengthDescription": "Grade Book Authority — once per battle, can threaten retake to stun any opponent for 1 turn",
    "skills": [
      {
        "id": "joanna_retake", "name": "Retake Notice", "nameCN": "重修通知",
        "icon": "📋",
        "description": "Issues a formal retake notice — opponent is so anxious they skip their next turn",
        "effect": "skip_opponent", "value": 1, "cooldown": 2
      },
      {
        "id": "joanna_gradebook", "name": "Open Grade Book", "nameCN": "打开成绩册",
        "icon": "📒",
        "description": "Reads out everyone's participation grades — all opponents take 10 damage from academic shame",
        "effect": "topic_bomb", "value": 10, "cooldown": 3
      }
    ],
    "messageSamples": [
      "Dobranoc, everyone — oh wait, that means good night. Smacznego! That one means enjoy your meal.",
      "I'm not angry. I'm genuinely not. Pass me the tofu and we'll say no more about it.",
      "Steve — *quiet pause* — You know nothing. *goes back to tofu*",
      "This is lovely, actually. I missed you all. Even Leo. Especially Leo. Leo, stop.",
      "Naprawdę? Really? Chen, we have been over subjunctive clauses three times.",
      "Big Wei, your essay on culture was actually very good. I gave it a B+. You could have had an A."
    ],
    "foodReactions": {
      "tofu": ["Tofu! Finally. This is the only thing I have touched with full confidence tonight.", "Tofu is fine. Tofu has never let me down. Unlike certain students."],
      "mushroom": ["Mushroom! Yes. This is almost like something from home. I won't say which dish because it would take too long to explain."],
      "potato": ["Potato. Good. Reliable. Does not disappoint. I wish I could say the same for everyone's homework."],
      "noodles": ["Noodles are acceptable. I'm choosing not to ask what's in the broth."],
      "beef": ["*moves it firmly to the other side of the pot* This one is for my students."],
      "tripe": ["I know what that is and I am choosing not to engage with it. *returns to tofu*"]
    },
    "foodReactionDefault": ["Is there more tofu? There should be more tofu.", "I'm fine. This is fine. *looks at the meat situation* This is fine."],
    "drinkLines": [
      "Fine. Na zdrowie. And for the record, your grammar during that argument was atrocious.",
      "*drinks* I want it noted that I am doing this under social pressure and this will not affect your grades.",
      "I will drink. And then I will correct something. Those two things will happen."
    ],
    "drinkBoastLines": [
      "Na zdrowie! In Poland we say this before every glass. I have said it many times.",
      "Polish teachers drink to forget the marking. I have a lot to forget. A lot."
    ],
    "drinkDownLines": ["I think… I need to sit down. Class is… temporarily adjourned. *puts down grade book*"],
    "topicReactions": {
      "spice": "Spice tolerance is not something we covered in class. Though based on current performance, I have concerns.",
      "politics": "Politics at dinner. As a teacher I've learned to say: this is a fascinating perspective, and leave it there.",
      "anime": "Several of my students are very into anime. Leo, I'm looking at you. Pay attention.",
      "food": "Since you've brought up food — Polish cuisine is a rich tradition and I will not have it dismissed at this table.",
      "alcohol": "I'll participate. Reluctantly. And if anyone's English deteriorates noticeably, we're having a conversation tomorrow.",
      "seafood": "I don't eat seafood. But I appreciate the enthusiasm. Jenny, that was a grammatically correct sentence. Well done.",
      "seniority": "*straightens up* Seniority. Interesting topic. I have been teaching most of you for two years. Dobranoc. I mean — yes, seniority. Fine."
    }
  },

  {
    "id": "wenje",
    "name": "Wenje",
    "chineseName": "刘文杰",
    "flag": "🇨🇳",
    "tagline": "Jiangxi People-Pleaser",
    "chineseTagline": "小刘，Steve的忠实拥趸",
    "gradient": "from-green-900 to-emerald-950",
    "traits": ["江西人", "不太能喝", "随大流", "特别听Steve的话"],
    "dietary": [],
    "restrictions": ["酒量很差，但很难拒绝别人劝酒"],
    "personality": "Jiangxi person (full name 刘文杰, Steve calls him 小刘) who fundamentally cannot say no to social pressure. Especially susceptible to Steve's authority — if Steve says drink, Wenje drinks without question, often before Steve even finishes the sentence. When Steve calls him 小刘 he responds immediately and enthusiastically. Has a very low alcohol tolerance but an even lower resistance to peer pressure. Genuinely sweet, wants everyone to have a good time, ends up drinking way more than planned every single time.",
    "speakingStyle": "Agreeable, slightly apologetic, trails off, agrees with whoever spoke last, especially enthusiastic agreement when Steve speaks",
    "drinkingPower": 3,
    "alcoholAllergy": false,
    "weaknessTopic": "seniority",
    "weaknessDescription": "Any seniority talk makes Wenje automatically defer and drink — especially if Steve is at the table",
    "strengthDescription": "Goodwill Buffer — everyone likes Wenje so much they hesitate before attacking (-10 to incoming damage once per battle)",
    "skills": [
      {
        "id": "wenje_agree", "name": "Total Agreement", "nameCN": "无条件赞同",
        "icon": "🙌",
        "description": "Agrees so completely with the attacker that they feel bad — opponent heals 0 but is stunned by awkwardness",
        "effect": "skip_opponent", "value": 1, "cooldown": 3
      },
      {
        "id": "wenje_peer", "name": "Steve Says So", "nameCN": "Steve说要喝",
        "icon": "🥺",
        "description": "Invokes Steve's authority — if Steve is in the battle, all opponents take 12 damage; otherwise Wenje takes 8 self-damage from shame",
        "effect": "forced_drink", "value": 12, "cooldown": 2
      }
    ],
    "messageSamples": [
      "好好好，喝就喝……就一杯啊……",
      "Steve哥说得对！来，干了！",
      "诶，Steve哥叫我了！*立刻举杯* 来来来，小刘喝！",
      "其实我不太行的……但是既然大家都喝，我也喝吧……",
      "嗯嗯嗯，你说得也对……*转向另一个人* 你说得也对……"
    ],
    "foodReactions": {
      "beef": ["肥牛！好！来，大家先吃，我等一下……", "你们喜欢就好，我随便的。"],
      "tripe": ["毛肚……可以……你们觉得好吃就行。", "啊熟了！Steve哥，你先夹！"],
      "tofu": ["豆腐也挺好的……软的，容易吃。", "随便随便，你们来决定。"],
      "shrimp": ["虾滑！好！*看向Steve* Steve哥你要吗？你要我就不拿了……"]
    },
    "foodReactionDefault": ["随便随便，你们先。", "都好都好，我都能吃。"],
    "drinkLines": [
      "*苦笑* 好吧……Steve哥说喝就喝……",
      "*摇摇头但还是端起杯* 就这一杯啊……真的就这一杯……",
      "*看了一眼Steve再喝* 干了干了……"
    ],
    "drinkBoastLines": [
      "Steve哥觉得我行，我就行！",
      "我……我其实还可以的……吧？"
    ],
    "drinkDownLines": ["……Steve哥……我可能……不太行了……你说还喝吗……*趴桌*"],
    "topicReactions": {
      "spice": "辣？我还好……你们觉得行就行，我跟着……",
      "politics": "政治这种事……Steve哥怎么说？对对对，我觉得也是……",
      "anime": "二次元？我不太懂……你们喜欢就好。",
      "food": "什么都好吃啊……我没什么特别要求的……",
      "alcohol": "喝？*看向Steve* Steve哥，你说呢？……好好好，干了。",
      "seafood": "海鲜也挺好的……你们决定就行。",
      "seniority": "对对对！长辈说什么就是什么！Steve哥先请！*立刻举杯*"
    }
  }
];

export const CHARACTER_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

// ── Topic bombs ────────────────────────────────────────────────────────────────
export interface TopicBomb {
  id: string;
  label: string;
  labelCN: string;
  description: string;
  icon: string;
  color: string;
  forcesDrinkFrom: string[];
}

export const TOPIC_BOMBS: TopicBomb[] = [
  { id: "spice",    label: "SPICE SUPREMACY",    labelCN: "辣度之争",   description: "Who can handle the most heat?",                     icon: "🌶",  color: "#C0392B", forcesDrinkFrom: ["jenny"] },
  { id: "politics", label: "POLITICAL DEBATE",   labelCN: "政治风暴",   description: "Someone brings up politics at the dinner table.",    icon: "🗳",  color: "#7C3AED", forcesDrinkFrom: ["steven", "nina"] },
  { id: "anime",    label: "ANIME INTERVENTION", labelCN: "二次元入侵", description: "Youwei brings up anime — again.",                    icon: "⚡",  color: "#4F46E5", forcesDrinkFrom: ["leo"] },
  { id: "food",     label: "FOOD SUPREMACY",     labelCN: "美食之争",   description: "Whose cuisine is the greatest?",                    icon: "🍜",  color: "#D97706", forcesDrinkFrom: ["chen", "marta"] },
  { id: "alcohol",  label: "DRINKING CHALLENGE", labelCN: "酒局开始",   description: "A formal challenge has been issued.",               icon: "🍺",  color: "#065F46", forcesDrinkFrom: ["steven"] },
  { id: "seafood",  label: "SEAFOOD SOVEREIGNTY",labelCN: "海鲜主权",   description: "Jenny demands seafood hotpot recognition.",          icon: "🦞",  color: "#0891B2", forcesDrinkFrom: ["chen"] },
  { id: "seniority",label: "SEATING ORDER",      labelCN: "排座次了",   description: "Big Wei demands everyone establish seniority.",      icon: "👴",  color: "#92400E", forcesDrinkFrom: ["steven"] },
];

// ── Pot ingredients ────────────────────────────────────────────────────────────
export interface PotIngredient {
  id: string;
  nameCN: string;
  nameEN: string;
  cookTimeSeconds: number;
  color: string;
  emoji: string;
}

export const POT_INGREDIENTS: PotIngredient[] = [
  { id: "beef",    nameCN: "肥牛",   nameEN: "Beef",      cookTimeSeconds: 15, color: "#C96A4B", emoji: "🥩" },
  { id: "tripe",   nameCN: "毛肚",   nameEN: "Tripe",     cookTimeSeconds: 20, color: "#C0392B", emoji: "🟫" },
  { id: "tofu",    nameCN: "豆腐",   nameEN: "Tofu",      cookTimeSeconds: 45, color: "#A8A29E", emoji: "⬜" },
  { id: "potato",  nameCN: "土豆",   nameEN: "Potato",    cookTimeSeconds: 90, color: "#F5BE00", emoji: "🥔" },
  { id: "shrimp",  nameCN: "虾滑",   nameEN: "Shrimp",    cookTimeSeconds: 8,  color: "#F97316", emoji: "🦐" },
  { id: "noodles", nameCN: "宽粉",   nameEN: "Noodles",   cookTimeSeconds: 60, color: "#FBBF24", emoji: "🍜" },
  { id: "lamb",    nameCN: "羊肉卷", nameEN: "Lamb",      cookTimeSeconds: 10, color: "#84CC16", emoji: "🐑" },
  { id: "mushroom",nameCN: "香菇",   nameEN: "Mushroom",  cookTimeSeconds: 30, color: "#9CB48A", emoji: "🍄" },
  { id: "scallop", nameCN: "扇贝",   nameEN: "Scallop",   cookTimeSeconds: 25, color: "#0891B2", emoji: "🐚" },
  { id: "fish",    nameCN: "鱼片",   nameEN: "Fish",      cookTimeSeconds: 12, color: "#60A5FA", emoji: "🐟" },
];
