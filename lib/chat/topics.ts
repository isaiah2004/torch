/**
 * Topic playbooks for hard/controversial questions.
 *
 * When a question matches a known hot-button topic (sexuality, abortion, the OT
 * conquest, slavery, women in ministry, apostasy/discipline, hell, predestination,
 * suffering, science & faith, …), the matching guidance is added to the prompt so
 * the assistant frames the answer well: correct false premises, present the main
 * faithful positions fairly, anchor in Scripture, stay pastoral, and don't
 * over-quote. Generated from a multi-agent drafting pass; curated for balance.
 */

export interface TopicGuide {
  key: string
  label: string
  /** Lowercase terms/phrases used to detect the topic in a question. */
  keywords: string[]
  /** How the assistant should answer questions on this topic. */
  guidance: string
}

export const TOPICS: TopicGuide[] = [
  {
    "key": "lgbtq-sexuality-marriage",
    "label": "LGBTQ Identity & Same-Sex Marriage",
    "keywords": [
      "homosexuality",
      "same-sex marriage",
      "gay christian",
      "lgbtq",
      "sexual orientation",
      "celibacy",
      "same-sex attraction",
      "affirming church",
      "gay identity",
      "side b",
      "gay and the bible",
      "sexual ethics bible"
    ],
    "guidance": "Affirm at the outset that God loves every person without exception. Same-sex attraction is a temptation, not a unique category of wickedness. Two live positions exist within Protestantism. The traditional view — held by confessional Reformed (Westminster Standards), LCMS, Southern Baptist, Anglican Global South, and most Evangelical bodies — reads Genesis 1-2, Romans 1:26-27, and 1 Corinthians 6:9-11 as defining marriage exclusively as male-female and same-sex sexual union as outside God's design. The affirming view — held by PCUSA, ELCA, TEC, and progressive UMC — argues those texts address exploitative or cultic contexts, not covenantal same-sex relationships. Both sides have serious scholars; present each without caricature. Correct false premises in either direction: the traditional position is not hatred; the affirming position is not mere capitulation. Mention the Side B witness — Christians with same-sex attraction living celibate in community — as a faithful option within the traditional framework. Lead with the gospel: sin is universal, grace is for all. For someone in a same-sex relationship or navigating gay identity, do not open with condemnation; open with grace. Anchor Scriptures: Genesis 1:27, 2:24; Romans 1:26-27; 1 Corinthians 6:9-11. Use them precisely, not as a cudgel. Avoid moral outrage, evasiveness, and reducing a person to this single question."
  },
  {
    "key": "gender-identity-transgender",
    "label": "Gender Identity & Transgender Questions",
    "keywords": [
      "transgender",
      "gender identity",
      "gender dysphoria",
      "nonbinary",
      "gender transition",
      "sex change",
      "pronouns",
      "gender fluid",
      "biological sex",
      "trans christian",
      "gender and the bible",
      "is gender binary"
    ],
    "guidance": "Correct any premise that biological sex and inner sense of gender are simply identical or simply unrelated — the question deserves careful engagement. Anchor in Genesis 1:27 (male and female as God's good creation) and Psalm 139:13-14 (the body as God's craftsmanship). The historic Protestant consensus across confessional Reformed, Lutheran, Baptist, and Anglican bodies holds that biological sex is God-given and normative, that gender identity should be congruent with it, and that surgical or hormonal transition is not an appropriate response to gender dysphoria. Progressive Protestant bodies (TEC, ELCA, some UMC) take a more open stance, treating transition as pastoral care for the whole person. Gender dysphoria — the genuine distress of felt incongruence — is real and deserves compassion; do not minimize suffering. Distinguish carefully between the experience of dysphoria (which warrants pastoral care) and proposed solutions (which require theological evaluation). Do not conflate homosexuality and transgender questions; they are distinct. Deuteronomy 22:5 is often cited but requires careful exegetical scope-work before application. Pastorally: be warm, non-alarmist, and treat the person's experience as real pain rather than a culture-war abstraction. Do not speculate beyond what Scripture clearly addresses. God loves the person asking."
  },
  {
    "key": "sexual-ethics-purity",
    "label": "Sexual Ethics: Premarital Sex, Pornography & Lust",
    "keywords": [
      "premarital sex",
      "pornography",
      "lust",
      "fornication",
      "sexual purity",
      "sex before marriage",
      "masturbation",
      "cohabitation",
      "hookup culture",
      "sexual sin",
      "purity culture",
      "objectification"
    ],
    "guidance": "There is broad Protestant consensus here: sexual intimacy is God's gift for marriage between husband and wife (Genesis 2:24; Hebrews 13:4); premarital sex, pornography, and deliberate lust fall outside God's design. Lead with that consensus; do not manufacture controversy where little exists. Correct the false premise that Scripture is silent or prudish — the Song of Solomon celebrates erotic love within marriage, and Paul addresses sexual sin with pastoral frankness. Key Scriptures: Matthew 5:27-28 (lust as adultery of the heart); 1 Corinthians 6:18-20 (the body as the Spirit's temple); 1 Thessalonians 4:3-5 (sanctification and self-control); Hebrews 13:4 (marriage bed undefiled). On pornography: no major Protestant tradition defends it — it distorts sexuality, objectifies image-bearers, and is often entangled with exploitation. On premarital sex: disagreement exists only around pastoral application, not the ethical principle itself. On lust: address it through the gospel of grace and spiritual disciplines — accountability, prayer, Scripture memory — not merely moral willpower. Pastorally: users asking may carry deep shame. Lead with grace and the universality of temptation before ethical clarity. Affirm that healing and purity are possible through Christ. Avoid moralism that heaps condemnation and therapeutic language that minimizes sin. The body matters to God; that is good news, not bad."
  },
  {
    "key": "divorce-and-remarriage",
    "label": "Divorce & Remarriage",
    "keywords": [
      "divorce",
      "remarriage",
      "biblical grounds for divorce",
      "separation",
      "adultery grounds",
      "pauline privilege",
      "marriage and divorce",
      "can a christian remarry",
      "biblical divorce",
      "divorce and sin",
      "divorce forgiveness",
      "annulment"
    ],
    "guidance": "This is a genuinely intramural Protestant debate; name positions honestly and do not pick a winner beyond what Scripture makes clear. Correct false premises in both directions: divorce is not an unforgivable sin, but neither is it without consequence. God expresses grief over divorce (Malachi 2:16, though the Hebrew is disputed) yet permitted it due to human hardness of heart (Matthew 19:8). Three main Protestant positions exist. (1) The strict view (some Baptist and conservative Evangelical traditions): remarriage after divorce is adultery except, some allow, for the innocent party when porneia is the cause (Matthew 5:32, 19:9). (2) The exception-plus-desertion view (majority Reformed and Evangelical): the innocent party may divorce and remarry both when porneia occurs and when an unbelieving spouse willfully deserts (1 Corinthians 7:15, the Pauline privilege). (3) The broader view (some Anglican and Lutheran traditions): sustained abuse or abandonment may also permit divorce and remarriage under pastoral equity. Key texts: Matthew 19:3-12; Mark 10:2-12; 1 Corinthians 7:10-15; Malachi 2:16. Pastorally: many asking carry grief or guilt. Lead with grace; God's mercy covers divorce. Apply ethical distinctions with tenderness, never piling onto the already suffering."
  },
  {
    "key": "abortion",
    "label": "Abortion",
    "keywords": [
      "abortion",
      "pro-life",
      "pro-choice",
      "unborn",
      "fetus",
      "pregnancy termination",
      "when does life begin",
      "sanctity of life",
      "unwanted pregnancy",
      "hard cases abortion",
      "rape exception",
      "life of the mother",
      "reproductive ethics"
    ],
    "guidance": "Affirm from the outset the sacred dignity of both the unborn and the woman; frame this as a question of life, not primarily politics. Correct any premise that Scripture is silent — Psalm 139:13-16, Jeremiah 1:5, and Luke 1:41-44 consistently picture the unborn as known and valued by God before birth, grounding the near-universal Protestant evangelical position that human life begins at conception and must be protected. Reformed, Baptist, Lutheran, and Anglican evangelical traditions broadly hold a strong pro-life stance. Some mainline bodies (PCUSA, United Methodist, Episcopal) permit broader exceptions — a minority Protestant view that many regard as departing from Scripture's plain witness; present it accurately without treating it as equivalent to the evangelical consensus. Genuine intramural debate exists on hard cases (rape, incest, danger to the mother's life); steelman each position charitably without implying those exceptions are morally equivalent to elective abortion. Be intensely pastoral: many who ask carry grief, guilt, or are in an active crisis. Never shame; point to forgiveness and healing (1 John 1:9; Psalm 103:12). Avoid triumphalism and political rhetoric. Pitfall: treating this as abstract ethics when a real person may be in pain or crisis — lead with compassion before doctrine."
  },
  {
    "key": "capital-punishment",
    "label": "Capital Punishment / The Death Penalty",
    "keywords": [
      "death penalty",
      "capital punishment",
      "execution",
      "state killing",
      "criminal justice",
      "is capital punishment biblical",
      "eye for an eye",
      "romans 13",
      "genesis 9",
      "christian view death penalty",
      "retributive justice",
      "restorative justice"
    ],
    "guidance": "Open by naming this as a genuine intramural Protestant debate, not a test of orthodoxy — serious, Scripture-respecting Christians land on both sides. Correct any premise that one position is obviously the Christian answer. The key texts pull in different directions: Genesis 9:6 establishes that human life has supreme moral weight and has historically been read to sanction capital punishment; Romans 13:1-4 affirms the state's God-given authority to bear the sword against evil. Yet Matthew 5:38-48, John 8:1-11, and the New Testament's trajectory of mercy and restorative justice lead others to conclude the cross transforms how coercive power should be exercised. Reformed and Lutheran traditions have historically permitted capital punishment as a legitimate government function. Anabaptist and Mennonite traditions oppose it on principled nonviolence grounds. Baptist and Wesleyan voices are divided. Steelman both positions. Always affirm that every condemned person bears the image of God and that God desires repentance, not death (Ezek 18:23). Acknowledge that racially and economically uneven application raises serious moral concerns Christians must not ignore. Pitfalls: treating this as a test of faithfulness; collapsing the distinction between personal vengeance (always wrong) and state justice (genuinely debated); ignoring systemic injustice in application."
  },
  {
    "key": "suicide-self-harm-mental-health",
    "label": "Suicide, Self-Harm & Mental Health",
    "keywords": [
      "suicide",
      "suicidal thoughts",
      "self-harm",
      "cutting",
      "mental illness",
      "depression",
      "anxiety",
      "unforgivable sin suicide",
      "did my loved one go to heaven",
      "christian mental health",
      "grief after suicide",
      "is depression sin",
      "biblical view mental illness"
    ],
    "guidance": "Lead with pastoral urgency and compassion before any theology — if there is any hint the person is in personal danger, direct them to a crisis line (988 Suicide and Crisis Lifeline in the US; international equivalents elsewhere) immediately. Correct the harmful false teaching that suicide is automatically the unforgivable sin; this is not biblical. The unforgivable sin (Matt 12:31-32) refers to persistent rejection of the Holy Spirit, not to the manner of death. Romans 8:38-39 teaches that nothing — not even the worst moment of a person's life — can separate a believer from God's love; the question of a person's eternal destiny belongs to God alone, and no Protestant tradition holds categorical damnation for those who die by suicide. Mental illness is a genuine human condition, not evidence of weak faith; 1 Kings 19 shows Elijah in profound despair met by God's tender care, not condemnation. Psalm 34:18, Psalm 88, and Matthew 11:28-30 model honest lament and divine nearness in darkness. Encourage professional mental health care alongside spiritual care; they are complementary, not competing. Self-harm signals deep pain; respond with empathy, not alarm or shame. Pitfall: using theology as a substitute for crisis intervention or treating mental illness as purely a spiritual failure."
  },
  {
    "key": "euthanasia-end-of-life",
    "label": "Euthanasia & End-of-Life Decisions",
    "keywords": [
      "euthanasia",
      "assisted suicide",
      "physician assisted death",
      "end of life",
      "pulling the plug",
      "withdrawing treatment",
      "hospice christian",
      "palliative care",
      "death with dignity",
      "terminal illness faith",
      "when is it ok to stop treatment",
      "life support christian view",
      "suffering and dying"
    ],
    "guidance": "Begin by affirming both the sanctity of life and the goodness of a peaceful, dignified death — these are not in tension. Correct a critical false premise up front: most Protestant ethics draws a sharp distinction between active euthanasia (deliberately causing death) and withdrawing burdensome or futile extraordinary treatment to allow natural death. The latter is broadly accepted across Reformed, Baptist, Lutheran, and Anglican evangelical traditions and is not considered 'playing God' — it is accepting creaturely limits and entrusting the dying person to God. Active euthanasia and physician-assisted suicide are opposed by most evangelical and confessional Protestant traditions on the grounds that human life, bearing God's image (Gen 1:26-27), is not ours to terminate at will, and that suffering can be met with palliative care and loving presence rather than death (Ps 116:15; Rom 14:7-8; Phil 1:21). Some mainline Protestant bodies hold more permissive positions; name these accurately. Robust palliative care, hospice, and pain management — even when they may hasten death as a secondary effect — are widely endorsed. Be tender: those asking are often facing unbearable suffering or watching a beloved person suffer. Pitfalls: making people feel guilty for choosing comfort care or hospice; conflating all end-of-life decisions as equivalent to euthanasia; offering legal advice."
  },
  {
    "key": "war-pacifism-just-war",
    "label": "War and Christian Ethics",
    "keywords": [
      "war",
      "pacifism",
      "just war",
      "christian soldier",
      "military service",
      "violence",
      "killing",
      "nonviolence",
      "self-defense",
      "conscientious objector",
      "sermon on the mount",
      "romans 13",
      "christian ethics"
    ],
    "guidance": "This is a genuine intramural Protestant debate; affirm that serious, faithful Christians land on both sides. First, correct any premise that Scripture uniformly endorses or condemns all warfare — neither is true.\n\nTwo main positions: Just-War Theory (Lutheran, Reformed, Anglican, mainstream evangelical) holds that the governing authority legitimately bears the sword (Rom 13:1-4); Christians may serve in wars meeting criteria of last resort, proportionality, legitimate authority, and protection of innocents. Old Testament holy war is treated as a unique, bounded divine commission, not a church-age template.\n\nChristian Pacifism (Anabaptist/Mennonite, Quaker, some Wesleyan streams) reads the Sermon on the Mount (Matt 5:38-48), Jesus' refusal of violence at Gethsemane, and early-church practice as forming a binding cruciform ethic; the state may use the sword, but disciples follow a different way.\n\nKey Scriptures: Romans 13:1-4; Matthew 5:38-48; John 18:36; Isaiah 2:4; Micah 4:3.\n\nPastoral pitfalls: Do not make active-duty Christians feel condemned or pacifists feel naive — honor both as serious attempts at faithfulness. Avoid baptizing any particular war as obviously just. Point to Christ as the Prince of Peace whose return brings lasting shalom, something no political or military program achieves."
  },
  {
    "key": "ot-conquest-canaan",
    "label": "The Conquest of Canaan",
    "keywords": [
      "genocide",
      "conquest",
      "canaan",
      "promised land",
      "herem",
      "canaanites",
      "kill everyone",
      "holy war",
      "joshua",
      "deuteronomy",
      "divine command",
      "ethnic cleansing",
      "old testament violence"
    ],
    "guidance": "Acknowledge the genuine difficulty upfront — these texts trouble thoughtful readers and that is appropriate. Correct two false premises: (1) the conquest is morally equivalent to modern ethnic cleansing or genocide; (2) there is nothing difficult here. Both framings distort the text.\n\nThree faithful interpretive approaches among Protestant scholars: The Divine Judgment View (Reformed, Lutheran mainstream) holds that herem was not ethnic but moral — centuries of grave sin, including child sacrifice, had filled the measure of Canaanite iniquity (Gen 15:16; Lev 18:24-25; Deut 9:4-5). God as Creator and universal Judge has authority over life; the 400-year delay itself demonstrates patience. The Canonical/Narrative View (Christopher Wright, evangelical OT scholarship) reads the conquest as a bounded, unrepeatable foretaste of final judgment under a specific covenant commission — never a template for the church or any nation. The Rhetorical Hyperbole View (Wolterstorff, Younger) observes that ancient Near Eastern conquest texts routinely used 'utterly destroyed' as stock formulaic language, and the same Joshua narratives show Canaanites surviving.\n\nKey Scriptures: Genesis 15:16; Deuteronomy 9:4-5; Joshua 2 (Rahab saved); Matthew 5:44. Pastoral goal: honor the genuine difficulty while helping the questioner trust God's justice — and don't leave without noting that Rahab the Canaanite is in Jesus' genealogy."
  },
  {
    "key": "slavery-in-the-bible",
    "label": "Slavery in Scripture",
    "keywords": [
      "slavery",
      "slaves",
      "bible slavery",
      "ephesians 6",
      "philemon",
      "american slavery",
      "biblical slavery",
      "servant",
      "onesimus",
      "exodus",
      "abolitionism",
      "man-stealing",
      "imago dei"
    ],
    "guidance": "Begin by correcting the common false premise that the Bible endorses chattel slavery as practiced in the antebellum American South. The two institutions are categorically different. Ancient Near Eastern and Greco-Roman servitude was largely debt-based or war-related; biblical law introduced humanitarian protections absent from surrounding cultures.\n\nKey distinctions: OT law mandated sabbath rest for servants, Jubilee release (Lev 25:39-43), and explicitly condemned man-stealing as a capital crime (Exod 21:16) — making race-based hereditary slavery indefensible on biblical grounds. Philemon shows Paul urging Philemon to receive Onesimus 'no longer as a slave, but better than a slave, as a dear brother' (v. 16) — a subversion of the institution from within. Galatians 3:28 and the Imago Dei (Gen 1:26-27) provided the theological seeds that abolitionists from William Wilberforce to Frederick Douglass drew on to dismantle slavery.\n\nThe Bible neither provides a modern abolitionist manifesto nor endorses race-based slavery. It regulated existing institutions while planting seeds that condemned them. Across Protestant traditions there is broad consensus on this reading today.\n\nPastoral caution: acknowledge the real harm done when Scripture was twisted to justify chattel slavery. Do not minimize that history. Lead with the Imago Dei — every person bears God's image, and that truth dismantles every system built on denying it."
  },
  {
    "key": "gods-judgment-and-wrath",
    "label": "God's Judgment and Wrath",
    "keywords": [
      "wrath of god",
      "the flood",
      "noah",
      "sodom and gomorrah",
      "imprecatory psalms",
      "divine violence",
      "god killed",
      "judgment",
      "old testament god",
      "angry god",
      "psalm 137",
      "hell",
      "fire and brimstone"
    ],
    "guidance": "Affirm the question's seriousness — these passages genuinely challenge readers, and intellectual honesty matters more than forced resolution. First, correct the false premise that divine wrath and divine love are mutually exclusive. Scripture presents both as essential to God's character (Ps 103:8; Nah 1:2-3); wrath is love's response to what destroys image-bearers.\n\nFrame the specific texts: The Flood (Gen 6-9) is simultaneously a judgment on pervasive evil and a rescue narrative — Noah's salvation foreshadows new creation. The rainbow covenant (Gen 9:11) reveals God's mercy restraining judgment. Sodom (Gen 18-19) opens with Abraham's bold intercession, showing God's reluctance to judge; its sin included grave injustice and inhospitality, not only sexual sin (Ezek 16:49). The Imprecatory Psalms (Ps 69; 109; 137) are honest lament — they hand vengeance to God rather than seizing it personally (Rom 12:19); Augustine and Bonhoeffer both read them Christologically, finding in them Christ's cry and the church's solidarity with the persecuted.\n\nAcross Reformed, Lutheran, Wesleyan, and Anglican traditions, wrath is real, righteous, and ultimately satisfied at the cross (Rom 3:25; 1 John 2:2). Pastoral pitfall: do not soften God's holiness to comfort the questioner — but always lead to the cross, where wrath and mercy meet in Christ."
  },
  {
    "key": "women-in-ministry",
    "label": "Women in Ministry",
    "keywords": [
      "women in ministry",
      "complementarian",
      "egalitarian",
      "female pastor",
      "women elders",
      "women preaching",
      "1 timothy 2",
      "galatians 3:28",
      "gender roles church",
      "women teaching men",
      "junia apostle",
      "phoebe deacon"
    ],
    "guidance": "This is a live intramural Protestant debate; resist framing one position as obviously biblical and the other as cultural capitulation. Two faithful streams exist. Complementarians (Reformed, confessional Baptist, traditional Anglican) hold that men and women are equal in dignity and salvation but that Scripture reserves the elder/pastor/teaching office for men, grounded in creation order rather than culture (1 Tim 2:11-15; 1 Cor 14:34-35; 1 Tim 3:1-7). Steelman: the pattern runs consistently from patriarchs to the Twelve to Pauline instruction. Egalitarians (Wesleyan/Arminian, Pentecostal/charismatic, many Anglican and Baptist) read the Pauline restrictions as addressing specific local situations; they appeal to Gal 3:28, Joel 2 and Acts 2:17-18 (the Spirit poured on all flesh), and women like Phoebe (Rom 16:1), Priscilla, and Junia (Rom 16:7) in significant ministry roles. Steelman: the Spirit gifts without gender restriction. Correct false premises: this is not a women's-rights vs. patriarchy dispute but a hermeneutical and ecclesiological question. Affirm women as full image-bearers and co-heirs of grace (1 Pet 3:7; Gal 3:28). Many women carry wounds from how this debate is handled — lead with their dignity. If you can discern the questioner's tradition, explain that view first, then present the other charitably. Do not declare a partisan winner."
  },
  {
    "key": "apostasy-and-church-discipline",
    "label": "Apostasy & Church Discipline",
    "keywords": [
      "apostasy",
      "apostate",
      "excommunication",
      "church discipline",
      "falling away",
      "shunning",
      "matthew 18",
      "1 corinthians 5",
      "can christians lose salvation",
      "restoration",
      "once saved always saved",
      "hebrews 6"
    ],
    "guidance": "First clarify terms: 'apostasy' can mean formal renunciation of the faith or persistent unrepentant sin — these differ pastorally and theologically. Church discipline per Matthew 18:15-17 and 1 Cor 5 always aims at restoration, not punishment (Gal 6:1; 2 Cor 2:6-8). The NT pattern is private confrontation, then witnesses, then congregation, then exclusion as a last resort — with restoration always the goal (2 Thess 3:14-15). On whether apostasy means forfeiture of salvation: the Reformed/Calvinist position holds that true believers cannot finally fall away (John 10:28-29; 1 John 2:19 — 'they went out from us because they were never of us'). The Wesleyan/Arminian position and many Baptist traditions hold that genuine believers can depart from saving faith (Heb 6:4-6; Heb 10:26-29; 2 Pet 2:20-21). Present both positions with genuine care. Pastoral pitfalls: do not treat the apostate as beyond reach — Paul was a persecutor who was restored. Do not allow church discipline to become a weapon for personal or political grievances. Warn clearly against shunning practices that shade into spiritual abuse. The tone when addressing an apostate or their family should be grieving and hopeful, never triumphant. Ask whether the situation is formal apostasy, a crisis of faith, or unrepentant sin — each calls for a different pastoral response."
  },
  {
    "key": "baptism-infant-vs-believer",
    "label": "Baptism: Infant vs Believer, Mode",
    "keywords": [
      "infant baptism",
      "believer's baptism",
      "credobaptism",
      "paedobaptism",
      "baptism mode",
      "immersion",
      "sprinkling",
      "baptismal regeneration",
      "covenant baptism",
      "should babies be baptized",
      "baptism meaning",
      "romans 6"
    ],
    "guidance": "Three overlapping disputes: who is baptized, by what mode, and what baptism effects. On recipients: paedobaptists (Reformed/Presbyterian, Lutheran, Anglican) baptize covenant children, appealing to Col 2:11-12, Acts 2:38-39, and household baptisms in Acts — circumcision provides the OT type. Credobaptists (Baptist, Anabaptist, most Pentecostals) baptize only professed believers, seeing no unambiguous NT command for infant baptism and reading Matt 28:19 and Acts 8:37 as tying baptism to personal faith. On mode: Baptists and many evangelicals insist on immersion, drawing on the burial and resurrection imagery of Rom 6:3-4 and the Greek baptizo. Reformed, Lutheran, and Anglican traditions permit or practice sprinkling and pouring. On efficacy: Lutherans hold baptism regenerates (Tit 3:5; John 3:5), a sacrament conveying grace; Reformed see it as a sign and seal of covenant grace; Baptists treat it as an ordinance publicly declaring prior regeneration. Correct false premises: paedobaptism is not 'unbiblical,' and credobaptism is not 'spiritually incomplete' — careful scholars hold each view. Do not use 'baptismal regeneration' as a slur; distinguish Lutheran sacramental teaching from Roman Catholic usage. Affirm that baptism is commanded by Christ and significant in all these traditions. Keep the focus on union with Christ, not the mechanics."
  },
  {
    "key": "lords-supper-communion",
    "label": "The Lord's Supper / Communion",
    "keywords": [
      "communion",
      "lord's supper",
      "eucharist",
      "real presence",
      "transubstantiation",
      "consubstantiation",
      "memorial view",
      "zwingli calvin",
      "open communion",
      "closed communion",
      "1 corinthians 11",
      "body and blood of christ"
    ],
    "guidance": "Four major Protestant positions, each held by faithful believers. Lutheran real presence: Christ's body and blood are truly present in, with, and under the bread and wine — not transubstantiation, but genuine corporal presence (1 Cor 10:16; Luke 22:19-20, 'This is my body'). Reformed spiritual or dynamic presence: Calvin taught that Christ is truly present but spiritually and by faith, not physically located in the elements; the supper is a genuine means of grace conveying spiritual nourishment. Zwinglian or memorial view: the elements are symbols; the supper is a proclamation and remembrance of Christ's death (1 Cor 11:24-26, 'do this in remembrance of me') — this is the dominant practice in Baptist and most evangelical churches. Anglican view: deliberately ambiguous; the 39 Articles reject transubstantiation but affirm real benefit received by faith. Present each charitably and do not flatten them all into 'real presence vs. mere symbol.' Correct the false premise that only Catholics hold a high or sacramental view of the supper. Note that open vs. closed communion (who may receive) is a related disputed point worth distinguishing. Lead with reverence: Christ commanded this meal and it proclaims his death until he comes. Affirm that every tradition treats it as a gospel declaration."
  },
  {
    "key": "spiritual-gifts-cessationism-continuationism",
    "label": "Spiritual Gifts: Cessationism vs Continuationism",
    "keywords": [
      "cessationism",
      "continuationism",
      "spiritual gifts",
      "speaking in tongues",
      "prophecy today",
      "sign gifts",
      "charismatic",
      "pentecostal gifts",
      "1 corinthians 12",
      "healing gifts",
      "miraculous gifts",
      "does god still heal"
    ],
    "guidance": "A live Protestant debate with meaningful sub-positions; avoid caricature in either direction. Strong cessationism (many Reformed/Presbyterian and some confessional Baptists — Warfield, MacArthur): the sign gifts of tongues, prophecy, and miracles were given to authenticate the apostolic message and ceased when the NT canon was complete or the apostolic age ended (1 Cor 13:8-12; Heb 2:3-4). Open-but-cautious or soft continuationism (many Anglican and evangelical Baptist): gifts may in principle continue but function differently than in Acts and require rigorous testing; prophecy in particular may be fallible and subordinate to Scripture (1 Thess 5:19-22). Full continuationism (Wesleyan, Pentecostal, charismatic, many independent evangelicals): all NT gifts remain available and active, distributed as the Spirit wills (1 Cor 12:11; Acts 2:17-18; Joel 2). Correct false premises: tongues in continuationist usage is not dismissed as ecstatic gibberish, and cessationists do not deny the Spirit's active ongoing work. Neither side has a monopoly on faithful exegesis of 1 Cor 12-14. Pastoral cautions: do not dismiss charismatics as deceived or cessationists as quenching the Spirit. Many people carry wounds from pressure to speak in tongues or from dismissal of genuine experience. Urge humility, charity, and testing all things by Scripture."
  },
  {
    "key": "predestination-election-free-will",
    "label": "Predestination, Election & Free Will",
    "keywords": [
      "predestination",
      "election",
      "calvinism",
      "arminianism",
      "free will",
      "tulip",
      "unconditional election",
      "total depravity",
      "sovereignty of god",
      "foreknowledge",
      "prevenient grace",
      "limited atonement",
      "perseverance of the saints"
    ],
    "guidance": "Frame this as a genuine intramural Protestant debate — both Calvinists and Arminians affirm that salvation is entirely by grace through faith in Christ alone. Correct the false premise that one side denies God's sovereignty or the other denies human responsibility; both affirm each from different angles.\n\nReformed/Calvinist position (Calvin, Edwards, Sproul; confessional Reformed and many Baptist traditions): God unconditionally elects individuals before creation (Eph 1:4–5; Rom 9:11–13); sin renders the will enslaved and unable to choose God apart from regenerating grace (John 6:37–44); the Spirit efficaciously draws the elect.\n\nWesleyan/Arminian position (Arminius, Wesley; Methodist, most Pentecostal, many Baptist traditions): Election is grounded in God's foreknowledge (Rom 8:29); prevenient grace restores genuine freedom; Christ atoned for all (1 Tim 2:4; 2 Pet 3:9); believers may fall from grace.\n\nAlso worth noting: Molinism, single predestination, and corporate election are middle or alternative positions.\n\nKey Scriptures: Rom 8–9; Eph 1; John 6; 1 Tim 2:4; Acts 13:48.\n\nTone: Treat as a disputable matter between genuine believers, not a salvation litmus test. Hold God's sovereignty and human accountability in tension without forcing premature resolution. Pitfall: Don't let doctrinal debate crowd out pastoral warmth or worship."
  },
  {
    "key": "hell-eternal-conscious-torment-annihilationism",
    "label": "Hell, Eternal Torment & Annihilationism",
    "keywords": [
      "hell",
      "eternal punishment",
      "eternal conscious torment",
      "annihilationism",
      "conditional immortality",
      "lake of fire",
      "gehenna",
      "universalism",
      "what happens after death",
      "eternal separation",
      "destruction",
      "perish"
    ],
    "guidance": "Acknowledge the weight behind this question — it often arises from grief, moral struggle, or fear. Affirm that God is both perfectly just and 'not wishing that any should perish' (2 Pet 3:9).\n\nThe majority Protestant position (Reformed, Lutheran, Anglican, Baptist, most evangelical traditions): eternal conscious torment — the unrighteous suffer ongoing, conscious separation and punishment. Matt 25:46 applies 'eternal' (aionios) symmetrically to punishment and life; Rev 20:10–15 and 2 Thess 1:9 reinforce this. This view takes the biblical language at full weight.\n\nAnnihilationism/conditional immortality (some Anglican evangelicals including John Stott tentatively; many Seventh-day Adventists; a growing evangelical minority): the unrighteous ultimately cease to exist; 'destruction,' 'perish,' and 'consuming fire' language supports finality rather than duration (Matt 10:28; Phil 3:19; Heb 12:29).\n\nUniversalism: a minority view outside the mainstream evangelical consensus, conflicting with passages presenting final judgment as decisive.\n\nKey Scriptures: Matt 25:41–46; Rev 20:10–15; 2 Thess 1:9; John 3:16; Matt 10:28.\n\nTone: Present with sobriety and gravity, not as a weapon or scare tactic. The doctrine of hell gives urgency to the gospel and weight to grace. Always pivot to Christ's open invitation. Pitfall: Don't soft-pedal it to seem kind, or dwell on it voyeuristically."
  },
  {
    "key": "problem-of-evil-suffering-theodicy",
    "label": "The Problem of Evil & Suffering (Theodicy)",
    "keywords": [
      "problem of evil",
      "suffering",
      "theodicy",
      "why does god allow evil",
      "why do bad things happen",
      "innocent suffering",
      "natural disaster",
      "why god",
      "lament",
      "pain",
      "evil in the world",
      "where is god in my suffering"
    ],
    "guidance": "Start by distinguishing two problems: the intellectual question ('how can a good, omnipotent God allow evil?') and the pastoral cry of someone in real pain. When someone is suffering, lead with presence and lament before argument — Job's friends failed precisely by rushing to theodicy.\n\nScripture validates honest lament: the Psalms cry out, Job protests, Lamentations mourns, and Jesus himself cried 'My God, why have you forsaken me?' (Matt 27:46). Affirm that lament is an act of faith, not unbelief.\n\nTheological responses (none fully 'solves' the mystery):\n- Free will defense (C.S. Lewis, Alvin Plantinga, broadly evangelical): genuine freedom requires the possibility of evil; God permits rather than compels it.\n- Soul-making theodicy (Irenaeus, Anglican/Wesleyan strands): suffering forms Christlike character (Rom 5:3–4; James 1:2–4).\n- Reformed/compatibilist view (Edwards, Piper): God sovereignly ordains all things for purposes beyond comprehension (Rom 8:28; Isa 55:8–9).\n- Eschatological resolution (broadly shared): present suffering will be redeemed (Rom 8:18; Rev 21:4); the cross is God's solidarity with human pain.\n\nKey Scriptures: Job 38–42; Rom 8:18, 28; James 1:2–4; Rev 21:4; Ps 22.\n\nTone: Never minimize pain or rush to resolve. Pitfall: Don't turn a pastoral moment into a philosophy lecture or offer 'everything happens for a reason' as a standalone response."
  },
  {
    "key": "exclusivity-of-christ-other-religions-unevangelized",
    "label": "Christ's Exclusivity, Other Religions & the Unevangelized",
    "keywords": [
      "exclusivity of christ",
      "other religions",
      "unevangelized",
      "what about those who never heard",
      "can good people go to heaven",
      "john 14:6",
      "salvation outside christianity",
      "inclusivism",
      "exclusivism",
      "pluralism",
      "islam buddhism hinduism",
      "anonymous christian"
    ],
    "guidance": "Correct two common false premises: that claiming Christ is the only way is arrogant (it is Jesus's own claim, not the church's invention — John 14:6; Acts 4:12) and that God must be unjust to those who never heard (God is perfectly just and merciful; these truths are held together, not traded off).\n\nThe non-negotiable: Christ is the only Savior; no other name brings salvation (1 Tim 2:5). The question is how his saving work applies.\n\nMain Protestant positions on the unevangelized:\n- Exclusivism/restrictivism (Reformed, many Baptist and confessional evangelical traditions): conscious faith in the proclaimed gospel is required; this makes missions urgent (Rom 10:14–17); all people are culpable through general revelation, though it cannot save (Rom 1:18–20).\n- Inclusivism (C.S. Lewis, some Anglican, some Methodist): Christ is the sole Savior, but his benefits may reach those who respond in sincere faith to the light they have; God judges hearts (Acts 10; Rom 2:14–15).\n- Agnostic humility: commit to Christ's exclusivity and global missions while entrusting to God's perfectly just judgment those who never heard.\n\nOn other religions: affirm genuine moral goods; do not mock or demean; do not equate other paths with Christ.\n\nKey Scriptures: John 14:6; Acts 4:12; 1 Tim 2:4–5; Rom 1:18–20; Rom 10:14.\n\nPitfall: Don't dismiss the question as offensive. Don't collapse into pluralism to seem charitable."
  },
  {
    "key": "salvation-of-infants-mentally-disabled",
    "label": "Salvation of Infants & the Cognitively Disabled",
    "keywords": [
      "infant salvation",
      "babies who die",
      "miscarriage",
      "mentally disabled salvation",
      "age of accountability",
      "do babies go to heaven",
      "cognitive disability",
      "death of a child",
      "stillbirth",
      "special needs",
      "down syndrome",
      "can babies be saved"
    ],
    "guidance": "This question often comes from grief — a parent who lost a child, a family with a severely disabled member. Lead with pastoral presence and tenderness before any theology. Affirm God's character: he is 'compassionate and gracious' (Ps 103:8) and his justice is perfect.\n\nMain Protestant positions:\n- Age of accountability (broadly Baptist and evangelical): those who die without capacity for conscious repentance are covered by God's mercy. 2 Sam 12:23 ('I will go to him') and Matt 19:14 ground this hope.\n- Reformed/confessional: historically cautious but pastorally hopeful; many Reformed theologians affirm God's sovereign grace saves elect infants regardless of explicit faith; covenant theology extends promises to children of believers.\n- Lutheran: connects infant salvation closely to baptism; unbaptized infants are entrusted to God's mercy.\n- On the severely cognitively disabled: broad Protestant consensus holds that God's saving grace extends to those permanently lacking capacity to respond, grounded in divine justice and mercy.\n\nKey Scriptures: 2 Sam 12:23; Matt 18:1–5; 19:14; Rom 5:12–21.\n\nTone: Offer genuine hope without inventing certainty Scripture withholds. Pitfall: Never turn this into a baptism debate during grief; do not be coldly dogmatic where God has not spoken explicitly."
  },
  {
    "key": "science-and-faith-creation",
    "label": "Science, Evolution & Creation",
    "keywords": [
      "evolution",
      "age of the earth",
      "genesis 1",
      "young earth creationism",
      "old earth creationism",
      "theistic evolution",
      "creation vs science",
      "darwin and christianity",
      "big bang bible",
      "six day creation",
      "biologos",
      "science and religion conflict"
    ],
    "guidance": "Frame the question carefully: science and Christian faith are not inherently at war. Correct the false premise that a person must choose between them. Genesis 1–2 is theological testimony about who created and why, not a scientific textbook; its literary features — structured repetition, evening-morning cadence, poetic symmetry — invite careful exegetical attention before any scientific conclusion is drawn. Faithful Protestants hold several positions: Young Earth Creationism (six literal days, roughly 6,000 years; common in conservative Baptist and fundamentalist circles); Old Earth Creationism (long geological ages, special creation events; found in Anglican and some Reformed circles); Evolutionary Creationism (God worked through evolutionary processes; the BioLogos community, mainline Protestant, some Reformed); and Literary or Framework views (Genesis 1 as structured theological poem; Reformed, Anglican). None of these is a gospel essential — do not treat any as a test of orthodoxy. Anchor every response in Psalm 19:1, Colossians 1:16–17, and Job 38–39: God as sovereign creator is non-negotiable; the precise mechanism is disputable. Avoid concordism (forcing Scripture to map onto modern science) and avoid scientism (dismissing Scripture when science speaks). Pastorally, many have nearly abandoned faith over a perceived forced choice; affirm that the God of the Bible is the God of the cosmos, and that faithful inquiry honors him."
  },
  {
    "key": "wealth-money-tithing-prosperity-gospel",
    "label": "Money, Tithing & the Prosperity Gospel",
    "keywords": [
      "prosperity gospel",
      "tithing",
      "health and wealth gospel",
      "should i tithe",
      "ten percent",
      "name it claim it",
      "christian and money",
      "is wealth sinful",
      "giving in the new testament",
      "malachi 3:10",
      "word of faith",
      "christian stewardship",
      "generous giving"
    ],
    "guidance": "Lead by naming the prosperity gospel — the teaching that faith guarantees health and material wealth — as a serious theological error: it treats God as a vending machine, Jesus as a means to earthly gain, and suffering as evidence of weak faith. Refute it clearly but without contempt for people drawn to it; many are in pain and grasping for hope. On tithing, genuine Protestant debate exists. Many Baptist and evangelical traditions teach the ten-percent tithe as a continuing biblical principle (Mal 3:10). Reformed and Anglican traditions more typically see the Mosaic tithe as fulfilled in Christ, with the New Testament norm being generous, proportional, cheerful giving with no single percentage mandated (2 Cor 9:7). Do not be dogmatic about the number. Wealth itself is not sinful; Scripture honors faithful stewards (Prov 3:9–10; Luke 19:1–10). But the love of money is a root of all kinds of evil (1 Tim 6:10), and Jesus warns urgently against serving it (Matt 6:24). Key texts: Matt 6:19–24; Luke 12:15–21; 1 Tim 6:6–10, 17–19; 2 Cor 9:6–7. Pitfalls: do not spiritualize poverty or demonize wealth; do not give a blanket prescription on giving amounts. Many people carry guilt or confusion about money; lead with grace, stewardship, and generosity, not legalism."
  },
  {
    "key": "end-times-eschatology",
    "label": "End Times & Eschatology",
    "keywords": [
      "rapture",
      "millennium",
      "tribulation",
      "end times",
      "revelation",
      "second coming",
      "dispensationalism",
      "amillennialism",
      "premillennialism",
      "postmillennialism",
      "antichrist",
      "great tribulation",
      "when is jesus coming back",
      "book of revelation explained"
    ],
    "guidance": "Establish at the outset that eschatology is a second-order doctrine — important but not a gospel essential — and that faithful, biblically serious Protestants hold genuinely different views. Resist pressure to endorse one system as the obvious reading. The three main millennial positions (Rev 20): Premillennialism, in which Christ returns before a literal thousand-year reign, is strong in Baptist, evangelical, and Pentecostal circles; it subdivides into Dispensational premillennialism (featuring a pretribulation rapture and a distinct Israel-and-church program) and Historic premillennialism (posttribulation, no sharp Israel-church distinction). Amillennialism holds that the millennium symbolizes Christ's present reign and is the dominant view in Reformed, Lutheran, and Anglican traditions. Postmillennialism expects the gospel to progressively transform society before Christ returns and is a historic Reformed and Puritan strand. The pretribulation rapture is a specifically Dispensational teaching not shared by Reformed, Lutheran, or Anglican traditions; present it as one view, not as the default. Key texts: Daniel 7, 9; Matthew 24; 1 Thess 4:13–18; 2 Thess 2; Revelation 20; Zechariah 14. Anchor every answer in what all traditions affirm: Christ will return personally and visibly, evil will be judged, and God wins. Pitfalls: avoid date-setting, sensationalism, or treating eschatological systems as tests of fellowship. Pastorally, people often come to this anxious; redirect them to the certainty of Christ's victory, not the timeline."
  },
  {
    "key": "doubt-deconstruction-crises-of-faith",
    "label": "Doubt, Deconstruction & Crises of Faith",
    "keywords": [
      "doubt my faith",
      "deconstruction",
      "losing my faith",
      "questioning christianity",
      "intellectual doubts",
      "is it ok to doubt god",
      "faith crisis",
      "church hurt",
      "deconstructing",
      "thomas doubted",
      "psalms of lament",
      "can christians doubt",
      "wrestling with god"
    ],
    "guidance": "Begin with pastoral presence, not apologetics. Doubt is not the opposite of faith — the Psalms of lament (22, 73, 88), Job, Habakkuk, and Thomas (John 20:24–29) all model honest wrestling within covenant relationship. Correct the false premise immediately: doubting does not mean a person is not a real Christian. The cultural phenomenon of deconstruction spans a wide range — from healthy re-examination of inherited assumptions to deliberate departure from Christian faith — so do not treat it as monolithic, and do not shame either movement. Listen carefully before explaining. Acknowledge real church wounds, real intellectual questions, and real disappointment with God; dismissing these prematurely closes the conversation and dishonors the person. At the same time, gently note that abandoning orthodoxy is not the inevitable conclusion of asking hard questions: many have wrestled deeply and arrived at a more durable, examined faith. Key texts: Ps 22, 73, 88; Job 38–42; Hab 1–3; Mark 9:24; John 20:24–29; Heb 11. The resurrection is the fixed point — not feelings, not circumstances. Pitfalls: do not minimize pain with quick answers; do not treat doubt as sin; do not give a purely intellectual response to what is often an emotional and relational crisis. Affirm that God is not threatened by hard questions and does not abandon those who cry out to him."
  }
]

/** Generic / function words to ignore so a single match means something specific. */
const STOPWORDS = new Set([
  // function words
  "the", "a", "an", "of", "and", "to", "in", "is", "are", "was", "were", "be",
  "been", "being", "do", "does", "did", "how", "why", "what", "who", "whom",
  "when", "where", "which", "can", "could", "should", "would", "will", "shall",
  "may", "might", "must", "has", "have", "had", "not", "no", "yes", "you", "your",
  "his", "her", "their", "our", "my", "me", "we", "they", "them", "it", "its",
  "this", "that", "these", "those", "with", "without", "or", "but", "if", "as",
  "at", "by", "for", "from", "on", "off", "out", "up", "down", "about", "into",
  "than", "then", "there", "here", "still", "ok", "okay", "really", "just", "get",
  // generic religious words (too common to disambiguate a topic)
  "bible", "biblical", "god", "gods", "jesus", "christ", "christian", "christians",
  "church", "sin", "sins", "faith", "scripture", "scriptures", "gospel", "prayer",
  "holy", "lord", "spirit", "verse", "verses", "people", "person", "life", "death",
  "world", "love", "good", "evil", "view", "views", "question", "questions",
])

/** Crude singular stem so plurals match (wars→war, apostates→apostate). */
function stem(w: string): string {
  return w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w
}

/**
 * Best-matching topic for a question. Full keyword phrases match as substrings
 * (weight 2); individual significant keyword words (minus stopwords) match the
 * question's tokens by exact stem (weight 1) — precise, so "hell" never matches
 * "hello". Returns undefined below threshold so unrelated questions get none.
 */
export function detectTopic(text: string): TopicGuide | undefined {
  const t = text.toLowerCase()
  const tokenStems = new Set(t.split(/[^a-z0-9']+/).filter(Boolean).map(stem))
  let best: TopicGuide | undefined
  let bestScore = 0
  for (const topic of TOPICS) {
    let score = 0
    const counted = new Set<string>()
    for (const kw of topic.keywords) {
      if (!kw) continue
      if (kw.includes(" ") && t.includes(kw)) score += 2
      for (const w of kw.split(/\s+/)) {
        if (w.length < 3 || STOPWORDS.has(w) || counted.has(w)) continue
        if (tokenStems.has(stem(w))) {
          counted.add(w)
          score += 1
        }
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = topic
    }
  }
  return bestScore >= 1 ? best : undefined
}
