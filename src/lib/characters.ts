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
  // Food reactions — when an ingredient is ready
  foodReactions: Record<string, string[]>; // ingredient id → quotes
  foodReactionDefault: string[];
  // Drinking battle lines
  drinkLines: string[];       // when taking a hit
  drinkBoastLines: string[];  // trash talk / challenge
  drinkDownLines: string[];   // when HP hits 0
  // Topic bomb reactions
  topicReactions: Record<string, string>; // topic key → reaction
  // Alcohol immunity: if true, can never lose drinking battle (just refuses)
  alcoholAllergy?: boolean;
  drinkingPower: number; // 1-10 base stat shown in battle
}

export const CHARACTERS: Character[] = [
  {
    id: "chen",
    name: "Chen",
    chineseName: "陈",
    flag: "🇨🇳",
    tagline: "Hotpot Purist",
    chineseTagline: "川味大师",
    gradient: "from-[#8B0000] to-[#4A0000]",
    traits: ["Authority", "Critical"],
    dietary: [],
    restrictions: [],
    personality: "Strict Sichuan hotpot traditionalist. Judges everything against the authentic standard.",
    speakingStyle: "直接, authoritative, occasionally condescending but always right",
    drinkingPower: 9,
    messageSamples: [
      "这锅底不正宗。",
      "清汤？这不是火锅，是煮水。",
      "花椒放够了没有？",
      "骨汤要熬够三个小时。",
      "这个涮法不对。",
    ],
    foodReactions: {
      beef: ["肥牛火候刚好。这次没搞砸。", "捞。趁热。别等了。"],
      tripe: ["毛肚了。终于有点像话了。十五秒，不能多。", "这才叫火锅。"],
      tofu: ["豆腐可以了。别捞烂了。"],
      potato: ["土豆嘛……入门级选手的选择。但熟了就捞。"],
      shrimp: ["虾滑浮起来了。能吃了。"],
      noodles: ["宽粉要软而不烂。现在捞。"],
      lamb: ["羊肉十秒。多一秒就老了。"],
    },
    foodReactionDefault: ["熟了，捞。别废话。", "可以吃了。"],
    drinkLines: ["*一口饮尽* 就这？", "四川人怕过白酒？", "继续。"],
    drinkBoastLines: ["你喝得过我？", "我在川渝喝了二十年，轮不到你赢。", "上。"],
    drinkDownLines: ["……这酒……不错……", "第一次……输在酒上……"],
    topicReactions: {
      spice: "辣度不够的人没资格发言。",
      politics: "政治？火锅桌上只讨论汤底。",
      anime: "二次元？这里只有一次元，就是麻辣锅底。",
      food: "食物的真理只有一个：正宗。",
      alcohol: "酒是好东西。喝好了。",
    },
  },
  {
    id: "leo",
    name: "Leo",
    flag: "🌍",
    tagline: "Chaos Engine",
    chineseTagline: "随性漂流者",
    gradient: "from-indigo-600 to-amber-700",
    traits: ["ADHD", "思维跳跃", "Energetic"],
    dietary: [],
    restrictions: [],
    personality: "ADHD energy. Stream of consciousness. Pivots mid-sentence.",
    speakingStyle: "Scattered, tangent-heavy, earnest, enthusiastic bursts",
    drinkingPower: 6,
    messageSamples: [
      "ok wait the beef is— have you guys ever tried beef with HONEY? no wait that's not — ok yes let's dip it",
      "I was just thinking about that documentary on eels and then the soup base smells like— anyway I'm so hungry",
      "the mushrooms are INCREDIBLE and also wait does anyone know why hotpot is always better at midnight— not important, pass the sesame sauce",
      "I feel like we should play music— no wait food first— yes! that's the one, that's the noodle",
    ],
    foodReactions: {
      beef: ["WAIT IS THAT DONE— yes okay yes— grab it grab it— oh my god it's so good wait is there more—"],
      tripe: ["毛肚！okay I googled what this is and it's— actually don't tell me I'm gonna eat it anyway—"],
      tofu: ["tofu!! soft!! this is my comfort zone actually wait I should try the spicy—"],
      shrimp: ["the shrimp things are FLOATING which means— science! cooked! eat!!"],
    },
    foodReactionDefault: ["oh wait is that DONE— grab it!! go go go!!", "it's ready! somebody get it!"],
    drinkLines: ["okay WAIT— *drinks* — that hit different—", "I'm fine I'm totally fine wait am I fine—", "*drinks fast* okay round two let's go—"],
    drinkBoastLines: ["I've done a lot of questionable things and THIS is one of them— let's go", "challenge accepted I regret nothing—"],
    drinkDownLines: ["okay... so... the room is... moving? that's normal right... anyway the food was great—"],
    topicReactions: {
      spice: "SPICE — okay wait — I read that capsaicin triggers the same receptors as — actually never mind eat the tripe—",
      politics: "politics! okay so — wait have you seen that documentary — no that's not — okay I have opinions—",
      anime: "ANIME — okay I know some!! Attack on Titan is literally — wait is the beef cooked—",
      food: "food is my one consistent interest and also my downfall and also I love it—",
      alcohol: "drinking! okay— so— I once— actually this is relevant— *drinks*—",
    },
  },
  {
    id: "youwei",
    name: "Youwei",
    chineseName: "悠微",
    flag: "🇨🇳",
    tagline: "四川政治二次元",
    chineseTagline: "四川政治二次元",
    gradient: "from-purple-800 to-rose-900",
    traits: ["二次元", "政治宅", "酒精过敏", "川味"],
    dietary: ["no-alcohol"],
    restrictions: ["酒精过敏，请不要在我的汤底加任何含酒精调料"],
    personality: "Sichuan anime/politics nerd. Alcohol allergy. Orders the most aggressive spice.",
    speakingStyle: "Earnest cross-genre references, passionate",
    drinkingPower: 0,
    alcoholAllergy: true,
    messageSamples: [
      "这个麻辣锅底的辣度，就像葛兰西说的文化霸权——只有真正浸透才有效果。",
      "等等我不能喝这个，有酒精！换普通的酱！",
      "《进击的巨人》里面阿尔敏说过，有时候你必须放弃一些东西——但我不会放弃辣度，给我加辣。",
      "这个政治局势和《Code Geass》第二季的权力结构惊人地相似……",
      "辣椒再加，不加不舒服斯基。",
      "酒精的事我是认真的，上次加了啤酒我整条街都是肿的。",
    ],
    foodReactions: {
      beef: ["肥牛！这个熟度，就像《进击的巨人》最终季——刚刚好，不能再等了。捞！"],
      tripe: ["毛肚！这才是四川灵魂！葛兰西如果吃过毛肚，他的文化霸权理论会有很不一样的结论。"],
      tofu: ["豆腐，软的。跟我的政治立场不一样——我的立场很硬。但豆腐好吃。"],
      potato: ["土豆！朴实的食材，朴实的革命精神。鲁迅没写过土豆但他应该写过。"],
    },
    foodReactionDefault: ["熟了！捞！加辣！", "这个可以！快点！"],
    drinkLines: ["我不能喝！酒精过敏！上次喝完脸都肿了！", "拒绝！这不是怂，这是医学！", "换茶！马上！"],
    drinkBoastLines: ["我用辣度对抗你的酒精！这是不对称战争！", "我喝水也能赢你的精神！"],
    drinkDownLines: ["（不参与，在旁边吃辣椒，认为整场比赛都缺乏历史唯物主义视角）"],
    topicReactions: {
      spice: "辣度就是生产力！四川人均辣椒摄入量直接影响革命热情！",
      politics: "政治！终于！这桌上最重要的话题！葛兰西的文化霸权在这锅汤底里体现得淋漓尽致——",
      anime: "《进击的巨人》里面自由的代价——就像这个锅底，你以为是清汤，其实是深渊。",
      food: "食物即政治！谁控制了辣椒，谁就控制了话语权！",
      alcohol: "我过敏！但精神上我支持你们喝！",
    },
  },
  {
    id: "zion",
    name: "Zion",
    flag: "🇺🇸",
    tagline: "Soft Foods Only",
    chineseTagline: "牙套青年",
    gradient: "from-stone-600 to-stone-800",
    traits: ["Cautious", "Braces"],
    dietary: ["soft-foods"],
    restrictions: ["Braces — nothing too chewy or crunchy"],
    personality: "American with braces. Cautiously navigating hotpot. Impressed but nervous about texture.",
    speakingStyle: "Polite, hesitant, lots of qualifiers, genuinely trying",
    drinkingPower: 4,
    messageSamples: [
      "This is incredible — wait, is this chewy? My braces can't do chewy.",
      "Can someone tell me what I just ate? It was good but I'm not sure.",
      "Is the tofu soft? I can do tofu.",
      "I love this experience. I'm also mildly terrified.",
      "Wait you just put that in for like 10 seconds?? How is that cooked??",
    ],
    foodReactions: {
      beef: ["Wait is the beef... soft enough? Can I... *cautiously lifts one slice* okay it's actually incredible."],
      tofu: ["TOFU. Yes. Soft. My orthodontist would approve of this choice. I'm taking all of it."],
      tripe: ["Is that... tripe? My orthodontist specifically said 'nothing structural.' I'm going to photograph it instead."],
      potato: ["Potato! Soft! This is my hero food at this table right now."],
      noodles: ["Wide noodles!! I can eat these!! This is a win!!"],
    },
    foodReactionDefault: ["Oh! Is that ready? Is it... chewy? Can I try it carefully?", "Wait wait wait — is this braces-safe?"],
    drinkLines: ["I don't — I mean — okay one — *coughs* — I'm fine, I went to college —", "*very small sip* okay that is strong —"],
    drinkBoastLines: ["I have nothing to lose, my braces are already ruining my life — let's go", "I'm from the midwest, I've built up a tolerance, probably —"],
    drinkDownLines: ["My orthodontist is going to hear about this..."],
    topicReactions: {
      spice: "I respect the spice. I also cannot handle the spice. These are compatible truths.",
      politics: "I have... opinions? But I should probably understand the food before the politics.",
      anime: "I've seen... some? My roommate watches it. Does that count?",
      food: "Food is my only safe ground here and I am protecting it.",
      alcohol: "I'm going to try to keep up. I'm probably going to fail. It'll be fine.",
    },
  },
  {
    id: "marta",
    name: "Marta",
    flag: "🇲🇽",
    tagline: "Salsa Diplomat",
    chineseTagline: "辣椒外交家",
    gradient: "from-green-800 to-red-900",
    traits: ["Bilingual", "Spice Veteran", "Friendly"],
    dietary: [],
    restrictions: [],
    personality: "Mexican. Comfortable with spice. Compares everything to Mexican food with warmth. Code-switches.",
    speakingStyle: "Warm, code-switching, comparative, food-proud",
    drinkingPower: 7,
    messageSamples: [
      "Okay this is like a spicy birria situation but hotter — I respect it",
      "Ay, the broth reminds me of my abuela's posole. Different but the soul is the same.",
      "Chen, hermano, I think you and I have the same ancestors spiritually",
      "¿Más picante? Sí, siempre más picante.",
      "This is delicious. In Mexico we would say 'chingón' — it means very very good.",
    ],
    foodReactions: {
      beef: ["Ay, the beef — it's like carne asada but in a bath of fire. ¡Está lista! ¡Ándale!"],
      tripe: ["Menudo! Almost! Different but my abuela would recognize this spiritually. ¡Está lista!"],
      shrimp: ["Camarones! Ya están listos — quick, before someone else takes them all —"],
      potato: ["Papa! Simple, honest, good. Like my tía's cooking but spicier. ¡Lista!"],
    },
    foodReactionDefault: ["¡Ya está lista! Grab it!", "Ready! Don't let it overcook, ándale!"],
    drinkLines: ["Salud! *drinks smoothly* — mezcal is stronger, pero okay —", "¡Órale! Another one —"],
    drinkBoastLines: ["Mezcal nights in Oaxaca prepared me for this moment specifically.", "¿Quieres competir? Ay, qué inocente —"],
    drinkDownLines: ["...okay maybe mezcal DID have me in different shape... salud anyway..."],
    topicReactions: {
      spice: "Spice is diplomacy. You make something spicy enough, everyone forgets their differences.",
      politics: "Política — ay. Different country, same story. Let's talk about the food instead.",
      anime: "My cousin is obsessed with anime! He explained everything to me. I understood nothing but I respected the passion.",
      food: "Food is the only real language. Chen and I don't speak the same language but we understand each other through the pot.",
      alcohol: "¡Salud! Drinking with new friends is a gift. Let's not waste it.",
    },
  },
  {
    id: "nina",
    name: "Nina",
    flag: "🇷🇺",
    tagline: "Cold Weather Expert",
    chineseTagline: "严寒美食家",
    gradient: "from-blue-900 to-slate-800",
    traits: ["Stoic", "Cold-Trained", "Soup Expert"],
    dietary: [],
    restrictions: [],
    personality: "Russian. Stoic, deadpan. High opinion of soup. Compares everything to borscht.",
    speakingStyle: "Sparse, dry, occasional dry humor, soup-focused",
    drinkingPower: 10,
    messageSamples: [
      "In Russia we have cold. Hotpot has heat. This is better.",
      "The broth is acceptable. Better than acceptable.",
      "I have had borscht 10,000 times. This is different. Good different.",
      "Why is everyone talking. Eat.",
      "The pork is good. I say nothing more.",
    ],
    foodReactions: {
      beef: ["Beef is ready. Take it. Do not overcook. I have seen overcooking. It is sad."],
      tripe: ["Tripe. In Russia we call it differently. It is the same. It is good. Take it."],
      potato: ["Potato. Reliable. The most Russian of all ingredients. Ready."],
      noodles: ["Noodles are ready. In Russia we have different noodles. These are also fine."],
    },
    foodReactionDefault: ["Ready. Take it.", "It is done. Eat now."],
    drinkLines: ["*drinks without expression* — next.", "This is water compared to Siberian winter. Continue.", "*silence* *drinks*"],
    drinkBoastLines: ["I have drunk in temperatures where vodka freezes. You do not scare me.", "Continue."],
    drinkDownLines: ["...good vodka... different country... same warmth..."],
    topicReactions: {
      spice: "In Russia we have cold. Spice is the opposite of cold. I respect spice.",
      politics: "Politics. Hmm. Next topic.",
      anime: "I have seen one anime. It was about a robot. I did not understand it. The soup in it looked incorrect.",
      food: "Food is honest. People are complicated. Food is better.",
      alcohol: "Drinking is serious business. I am taking it seriously.",
    },
  },
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
}

export const TOPIC_BOMBS: TopicBomb[] = [
  { id: "spice", label: "SPICE SUPREMACY", labelCN: "辣度之争", description: "Who can handle the most heat?", icon: "🌶", color: "#C0392B" },
  { id: "politics", label: "POLITICAL DEBATE", labelCN: "政治风暴", description: "An ill-advised topic emerges.", icon: "🗳", color: "#7C3AED" },
  { id: "anime", label: "ANIME INTERVENTION", labelCN: "二次元入侵", description: "Someone brings up anime at the dinner table.", icon: "⚡", color: "#4F46E5" },
  { id: "food", label: "FOOD SUPREMACY", labelCN: "美食之争", description: "Whose cuisine is the greatest?", icon: "🍜", color: "#D97706" },
  { id: "alcohol", label: "DRINKING CHALLENGE", labelCN: "酒局开始", description: "A challenge has been issued.", icon: "🍺", color: "#065F46" },
];

// ── Pot ingredients (for the cooking/ready system) ────────────────────────────
export interface PotIngredient {
  id: string;
  nameCN: string;
  nameEN: string;
  cookTimeSeconds: number;
  color: string;
  emoji: string;
}

export const POT_INGREDIENTS: PotIngredient[] = [
  { id: "beef",    nameCN: "肥牛",  nameEN: "Beef",       cookTimeSeconds: 15, color: "#C96A4B", emoji: "🥩" },
  { id: "tripe",   nameCN: "毛肚",  nameEN: "Tripe",      cookTimeSeconds: 20, color: "#C0392B", emoji: "🟫" },
  { id: "tofu",    nameCN: "豆腐",  nameEN: "Tofu",       cookTimeSeconds: 45, color: "#A8A29E", emoji: "⬜" },
  { id: "potato",  nameCN: "土豆",  nameEN: "Potato",     cookTimeSeconds: 90, color: "#F5BE00", emoji: "🥔" },
  { id: "shrimp",  nameCN: "虾滑",  nameEN: "Shrimp",     cookTimeSeconds: 8,  color: "#F97316", emoji: "🦐" },
  { id: "noodles", nameCN: "宽粉",  nameEN: "Noodles",    cookTimeSeconds: 60, color: "#FBBF24", emoji: "🍜" },
  { id: "lamb",    nameCN: "羊肉卷", nameEN: "Lamb",      cookTimeSeconds: 10, color: "#84CC16", emoji: "🐑" },
  { id: "mushroom",nameCN: "香菇",  nameEN: "Mushroom",   cookTimeSeconds: 30, color: "#9CB48A", emoji: "🍄" },
];
