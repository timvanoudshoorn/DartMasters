// Downloads the pre-recorded Harrison announcer clips into assets/sounds/announcer/.
// Run with: node scripts/downloadAnnouncer.js
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds', 'announcer');

const FILES = {
  'score_1.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100607_3dfe1e66-6d0d-4f7b-b883-37bfe0d7e160.mp3',
  'score_2.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100651_8414c6b3-43b1-4f7d-96bc-3c93fd3bce19.mp3',
  'score_3.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100653_47173049-a80e-4237-ac72-ec0e0be9c4aa.mp3',
  'score_4.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100656_4262ed31-c681-4b6e-8df0-057f3da32a99.mp3',
  'score_5.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100658_cecd7de3-8306-4abf-a693-ece157b426d8.mp3',
  'score_6.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100659_8a65bc41-f6b6-4be7-ad91-67496b5a0122.mp3',
  'score_7.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100700_8934de9a-324b-4e5b-a2e7-a57746658a1b.mp3',
  'score_8.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100702_3d417fd3-9a46-40af-a004-d990bba9fa3d.mp3',
  'score_9.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100703_ded8ff3f-d58a-4a93-9d19-ba266f9153f1.mp3',
  'score_10.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100705_182bef3d-a844-46ee-968c-30e2c4441b5a.mp3',
  'score_11.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100707_aa1715d0-8b73-4a19-8e8d-586faba81266.mp3',
  'score_12.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100708_a4bdf68d-c4e5-441c-9c58-ae287478e248.mp3',
  'score_13.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100710_4c5433a9-59b9-40b6-baf4-8f0a377fa9b1.mp3',
  'score_14.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100712_cbd6903e-8270-4414-961a-43ace18a29df.mp3',
  'score_15.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100714_1d6c7a9b-3675-4314-9bec-2b52370f4b68.mp3',
  'score_16.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100716_16e63b14-ab46-4acc-a63a-11b9c9c61020.mp3',
  'score_17.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100717_2de879f3-96aa-4481-90ba-428a2d44ca80.mp3',
  'score_18.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100719_1e4b3a90-fa50-43ef-9acd-b6fe147970cd.mp3',
  'score_19.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100721_7dd82121-cb53-4454-aa13-ac69e30ff996.mp3',
  'score_20.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100723_0e84151b-ca6f-4d59-b2a5-75de0c1c92ff.mp3',
  'score_21.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100724_19bee5c0-5ed8-408a-8e06-92b8ff7c8cdc.mp3',
  'score_22.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100727_270ba391-cb74-4c6e-91a2-5c7d96f758ea.mp3',
  'score_23.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100729_46bd5e56-0728-4a51-87b9-bf04a6ed15f7.mp3',
  'score_24.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100730_fc1687d8-39a5-4ba7-905e-79095141869e.mp3',
  'score_25.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100732_c7bbad66-f6f6-4c79-a1d5-acf33e9723e6.mp3',
  'score_26.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100831_2a7cf8ea-f216-4191-868a-acb5e25625e8.mp3',
  'score_27.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100833_ba9d3545-5a72-47b4-bca3-e95f4376ce38.mp3',
  'score_28.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100835_5779a947-ade6-4686-8dcb-8e8109897f26.mp3',
  'score_29.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100837_bcee0cb4-1e3a-4e82-b6b5-38580e592eeb.mp3',
  'score_30.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100838_f067b4f7-c9e3-436a-8259-be5b0bc36572.mp3',
  'score_31.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100839_2c10dd69-0bfb-43cd-9c18-8ed1f3457b00.mp3',
  'score_32.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100841_854898f2-eb95-454c-bf95-433ef4e63536.mp3',
  'score_33.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100843_7c30099c-b26c-4442-aba3-79ebbdeb3dd4.mp3',
  'score_34.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100844_bdeb030e-857d-47fd-abe5-dd3469604a7b.mp3',
  'score_35.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100846_cfdea006-1bb5-4985-8ee5-ca5d20a0c93b.mp3',
  'score_36.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100848_40c4b245-34f9-4cdc-9d18-e57017b8b7c1.mp3',
  'score_37.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100850_a00fcbfc-962d-4c71-aa42-a3be133bdef6.mp3',
  'score_38.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100851_d766cf3d-c706-4d00-9b7c-95817047f1c4.mp3',
  'score_39.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100854_754b1e4a-526b-4cfa-adab-54f6cce2666f.mp3',
  'score_40.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100856_110685f7-3755-4fa7-9b54-c94451c1ef1c.mp3',
  'score_41.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100858_364978de-b334-4b96-8816-0452227661fc.mp3',
  'score_42.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100859_9807d389-7421-4c1e-b14e-16e75c09af2b.mp3',
  'score_43.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100901_d2af6c99-7070-43da-8660-25e6a22dbaf1.mp3',
  'score_44.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100902_e6be1491-a89f-453f-80df-91acde4a46d8.mp3',
  'score_45.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100904_17e825a5-b478-4774-8756-2305f26cae81.mp3',
  'score_46.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100906_2dab0a74-3598-4965-8e4e-1adac58fd7b7.mp3',
  'score_47.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100907_a693df0d-7972-47a8-bb1c-c7adc1ed18f9.mp3',
  'score_48.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100909_5b655b39-cf6e-47d5-a928-a7bbf08db78e.mp3',
  'score_49.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100910_cf7a6033-4ddc-4228-a44f-ad8a9d65e270.mp3',
  'score_50.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100912_3e909b44-e150-4fef-be89-5822cbf6ae45.mp3',
  'score_51.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100934_7214e833-70fb-4a10-9f28-acc7b75363c9.mp3',
  'score_52.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100936_809d4920-707f-4805-ab2f-4e6fb8f6fc7b.mp3',
  'score_53.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100937_f9d23b72-5df5-459b-bb00-4e7b42fad148.mp3',
  'score_54.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100939_dc052e5a-8f87-4a0a-aeee-f5481af81d5b.mp3',
  'score_55.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100940_53e8f721-e7e6-42cd-a8f5-d28f9ef61aae.mp3',
  'score_56.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100942_a321f079-dfab-491f-9305-81083f633c56.mp3',
  'score_57.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100944_d39cce46-4ea8-40b9-9c26-bc7d6e415560.mp3',
  'score_58.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100946_6a576547-4d21-4683-89b7-71b4d8cb60c5.mp3',
  'score_59.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100947_f677059b-dc3d-4963-9b07-3c9e66856e30.mp3',
  'score_60.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100949_41bf892d-f923-4e43-808b-085d96bbdc4c.mp3',
  'score_61.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100951_4e9242da-8820-4066-ae6c-24f203771649.mp3',
  'score_62.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100952_225f9b91-4ab0-47d5-abec-6dd3cb135684.mp3',
  'score_63.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100956_f9870a64-ece4-431e-b2df-a262c0fa9f78.mp3',
  'score_64.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100958_fd579b46-aa4a-41b3-8e14-08d562a46be9.mp3',
  'score_65.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_100959_d391e464-d629-4e1f-96f6-ac4635825bdb.mp3',
  'score_66.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101001_07bf16c0-94c4-44f6-8518-b535e2949c0e.mp3',
  'score_67.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101002_9e7546a0-0caf-44b2-bf6e-040ad218a0a5.mp3',
  'score_68.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101004_585cbefa-87e4-4b78-b461-0b647f01c98e.mp3',
  'score_69.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101007_7804457f-7ccf-4331-9f65-3b680c0c3511.mp3',
  'score_70.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101008_4f0a2d99-6017-4764-b928-0d0a168648f3.mp3',
  'score_71.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101010_3de8fac4-5142-45a0-9c69-4725b9324833.mp3',
  'score_72.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101011_a8da1a6e-969d-4842-bfae-be50f4faf69d.mp3',
  'score_73.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101013_e4020de1-0609-43f6-9755-925848ff1e2e.mp3',
  'score_74.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101014_a6e17eaa-6021-4c08-b7de-d2ef0fd3d120.mp3',
  'score_75.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101016_a1b50ae1-ee1e-4675-9e7b-1f25b4dfe33c.mp3',
  'score_76.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101037_1ffead7f-ee82-4910-81db-fee8aa6a92cc.mp3',
  'score_77.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101039_48a65acb-20a6-41f5-8b9b-e25a4becd5bc.mp3',
  'score_78.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101040_6d214596-8ede-418b-ade7-7508ee83f2d4.mp3',
  'score_79.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101042_1efcf841-6ff1-4b9e-9c29-38add3b46ffb.mp3',
  'score_80.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101044_fd9956e2-4cf3-4372-81ad-e5aeaddebc94.mp3',
  'score_81.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101045_ead97cb1-6b3d-4ab2-a9df-428583b8b496.mp3',
  'score_82.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101047_41ad7463-fe8b-4b9d-8520-682a6ff7f06b.mp3',
  'score_83.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101049_50080dfc-5100-4c57-8e40-5c9c1322d8cd.mp3',
  'score_84.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101051_94bff634-ae8f-4a62-b26d-b00128b7b3a3.mp3',
  'score_85.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101053_6c774bec-4377-4fa5-a769-254d9eab18e0.mp3',
  'score_86.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101054_a0be88a4-4ba4-4c6f-9d58-d3d76a441cbe.mp3',
  'score_87.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101056_6917435c-753b-43da-805d-5684fe10e920.mp3',
  'score_88.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101058_7f965104-5c97-4cf8-bfbd-468cd9667137.mp3',
  'score_89.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101059_ba3f51b4-918f-4419-8503-109da4c73f38.mp3',
  'score_90.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101101_c1b57d46-ecaa-4517-b40a-9e2b686f7875.mp3',
  'score_91.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101102_c4d86a76-ef46-47b3-ac0e-6173e0d1c4a4.mp3',
  'score_92.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101104_632714ac-e0c3-4978-aa32-424cc53d571d.mp3',
  'score_93.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101105_dc413ae2-a940-40dc-9ed1-e4f9629fb962.mp3',
  'score_94.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101107_afb16eea-ea30-47e9-aba1-f75e2631dd4a.mp3',
  'score_95.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101108_0a5c26bf-bba4-475d-adce-ea3de3b28717.mp3',
  'score_96.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101110_c82eb0b2-5a8f-4fa4-87af-10a6021f1722.mp3',
  'score_97.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101111_c6bcbb7c-4666-41e4-85a1-b225b5d40503.mp3',
  'score_98.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101113_7d54f380-4a3c-4c9a-b4fd-289b4e35ef0b.mp3',
  'score_99.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101115_42ad227b-79bd-4e1c-a882-abedf193c9bc.mp3',
  'score_100.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101117_10b1794a-ab3c-482a-8f4e-a56e48cd1840.mp3',
  'score_101.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101143_d8c0658e-a7d4-4e00-aa9f-39cd6643c24d.mp3',
  'score_102.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101144_06222dde-39aa-47b8-a919-1e3698b42298.mp3',
  'score_103.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101147_901d4e35-c845-4d4e-b470-483320ec0cf7.mp3',
  'score_104.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101148_bc2bc3ff-b612-42c1-a1dc-2857cfc85b8c.mp3',
  'score_105.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101150_176d7dac-3a2a-4411-bd0c-5861d8e9658b.mp3',
  'score_106.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101151_2e530f8f-30eb-4691-aa34-fb43c0d37e1f.mp3',
  'score_107.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101153_382ab1c0-abb9-46c2-9da4-239d95628f49.mp3',
  'score_108.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101154_27f68f88-279a-45fb-b2be-c2381938035c.mp3',
  'score_109.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101156_b6847a58-0951-40c6-9a86-259e3910aa8e.mp3',
  'score_110.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101158_449ee612-88d3-4e82-821d-faff6a50b017.mp3',
  'score_111.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101159_360cb3c7-ba17-427f-a6ed-a656c9730b0b.mp3',
  'score_112.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101201_a2dc1ffe-4461-4c91-9cd4-e4fe21eaee61.mp3',
  'score_113.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101202_80d7b580-2600-4e12-847b-e8e219c8e122.mp3',
  'score_114.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101204_9f1ff74d-c670-4b50-b9cc-8cfa0031f4bc.mp3',
  'score_115.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101206_57888e57-9932-4ef1-9686-dce0daf9afaa.mp3',
  'score_116.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101208_5d2e8157-8c6a-43f1-8aa6-d9f9b9aeeb7b.mp3',
  'score_117.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101210_30d7f0b8-8e60-4caa-b01c-8de76200e738.mp3',
  'score_118.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101212_80f2dc25-9499-4b2a-a793-f1092fd5168e.mp3',
  'score_119.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101213_23b2ffc5-d3e2-4295-b716-dcf700495966.mp3',
  'score_120.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101215_92a1a5d0-5f4b-4609-b710-fd159a787a23.mp3',
  'score_121.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101216_e8812217-3af6-46bb-b54b-b5b0a9b1fa73.mp3',
  'score_122.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101218_8f0b7443-d560-4ae1-a5fb-0768febf7767.mp3',
  'score_123.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101219_e02b798f-12cc-4bd3-aea9-0e43a975829f.mp3',
  'score_124.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101221_a1a41237-9547-4504-bcfd-a3e207998325.mp3',
  'score_125.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101223_896ac254-a673-4f82-b11a-2941d26eb9c0.mp3',
  'score_126.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101245_f64857e4-9cac-4168-914e-dce989fda009.mp3',
  'score_127.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101247_a4110e08-1822-49f2-80a2-4e3edad1eb1b.mp3',
  'score_128.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101249_27bc2169-8a6f-431e-9d61-a8a491cc7299.mp3',
  'score_129.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101250_691ee700-1d18-4865-b2ef-841a471dabaa.mp3',
  'score_130.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101252_2d9667fd-fd39-489b-a350-1c907b83c2f6.mp3',
  'score_131.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101254_04843491-531e-411b-9468-84abc00fa168.mp3',
  'score_132.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101255_84c56444-2d06-4800-a9c5-7ac281e60215.mp3',
  'score_133.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101257_e98e9eda-3176-45df-9c3b-5e4a8d6d244c.mp3',
  'score_134.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101258_576dc031-30f3-42a6-a1b3-4b091cb353d0.mp3',
  'score_135.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101300_4ceb58f2-e6b7-4d5b-9bf4-7bb395c4c3f2.mp3',
  'score_136.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101302_5fac953d-5700-4acd-b68d-3ca880994e3f.mp3',
  'score_137.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101304_ef0788ea-597f-4649-9750-dc3f06848ade.mp3',
  'score_138.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101305_99de2a04-7a3a-413f-a450-afda84ac8470.mp3',
  'score_139.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101307_11c3d147-5165-4455-a41e-8c326d733c05.mp3',
  'score_140.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101308_88599118-13e2-4cfb-9ae7-3d881fb6a704.mp3',
  'score_141.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101310_15781d8d-84fa-4d2d-b280-42ff54625a2d.mp3',
  'score_142.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101312_f7580be7-a574-4113-92d8-497437a7e3c4.mp3',
  'score_143.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101314_9e28e43e-efa0-464e-b2db-c78e25b18350.mp3',
  'score_144.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101316_5e22c505-c589-4e3b-a97d-af9d3175cfda.mp3',
  'score_145.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101317_6e1c7f06-ebfd-4093-9dba-f72b39418265.mp3',
  'score_146.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101319_eb19af4f-f47a-483b-9042-5d28a0782215.mp3',
  'score_147.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101320_016e6b4d-bd75-4be3-8673-8f238043a68d.mp3',
  'score_148.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101322_94e03e84-8444-4bc9-bc8e-75446661fd4f.mp3',
  'score_149.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101323_c544fd8c-1216-4241-8f5f-44e072f9bd19.mp3',
  'score_150.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101325_fc7d6dd7-313d-4d4b-9d59-dbadbbfbf6f3.mp3',
  'score_151.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101347_5003ea12-5fb4-4c9a-91c2-b6a3435c54f7.mp3',
  'score_152.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101349_2964e128-e571-44c5-9ee1-748db4dad6a8.mp3',
  'score_153.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101350_9f7ae898-a8a5-45bb-a785-05749a089241.mp3',
  'score_154.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101352_fa32e84c-5cfa-46b0-9d67-7d209865da5a.mp3',
  'score_155.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101354_4c370b3d-2025-4617-b760-f1c0382cff90.mp3',
  'score_156.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101355_e6ab0283-c268-4856-ac4c-f929f5c930b3.mp3',
  'score_157.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101357_26e64c57-aa40-4bcf-a8d8-eacfe51b9764.mp3',
  'score_158.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101358_24eaa553-a1c1-4c97-b4aa-2b9060d72c8f.mp3',
  'score_159.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101400_733b06b4-b003-4176-8b6e-0d64a343fd92.mp3',
  'score_160.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101402_5db8bd24-aaa5-425b-85cd-fc243503ddce.mp3',
  'score_161.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101404_bbbb7cb9-15b3-4ede-a3c6-8c18decd4e5e.mp3',
  'score_162.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101405_4398cf71-00b4-4353-a063-b287d90580f7.mp3',
  'score_163.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101407_4318282d-4e40-48cc-a48b-749d5e28d751.mp3',
  'score_164.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101408_1a0f4e52-5f12-4da9-9fc3-ac1582b1b3c5.mp3',
  'score_165.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101410_04acdbac-c0f2-4b38-8735-8746598e5f41.mp3',
  'score_166.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101411_4e852b55-834f-4941-a033-b3b77f9d8f01.mp3',
  'score_167.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101413_40d4e8b0-4f6b-4a08-b9c0-edf40f6a7b8c.mp3',
  'score_168.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101415_a3a96616-0ba7-4546-8574-e102488d96d9.mp3',
  'score_169.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101416_e9e84e80-90c3-4219-9034-9ef73706c628.mp3',
  'score_170.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101418_77a79ede-f2ed-48d6-aca0-de55716ceac6.mp3',
  'score_171.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101419_16611dab-3ff0-432c-a8e3-eeb9497505eb.mp3',
  'score_172.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101421_2692a1f2-f50a-4d04-b5aa-3a5e0463ac92.mp3',
  'score_173.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101422_75ecd0a0-3c02-4098-8d55-d270325de678.mp3',
  'score_174.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101424_3c3deb99-65d2-4f82-9462-e406b7e1045d.mp3',
  'score_175.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101425_9a50a164-ec48-423e-9761-9bfb350a64ec.mp3',
  'score_176.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101427_c790f4da-1d04-4535-9180-80c2f820210d.mp3',
  'score_177.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101428_53308cf4-e017-4070-a644-cbf3301a770a.mp3',
  'score_178.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101431_ad28a4c1-447c-40a8-83e1-b1f5c6ecaf4f.mp3',
  'score_179.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101433_58df0a24-65c3-4a22-b06a-9a29564f33e4.mp3',
  'score_180.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260630_101434_7533a151-ac41-4215-9ff5-e67ed771eecc.mp3',
  'bust.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260629_114607_1bd695c7-b5af-4eaa-a971-0a0040ecabde.mp3',
  'game_on.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260629_114609_94930ad2-ce6e-4e1f-b81f-cc26b5a163b3.mp3',
  'game_shot.mp3': 'https://d8j0ntlcm91z4.cloudfront.net/user_3Ew8b0alKEqs3klkRM9HyN65Fj7/hf_20260629_114611_a62e7a6e-5bdd-4353-a997-ca6de9be246b.mp3',
};

async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

async function downloadWithRetry(filename, url, destPath) {
  try {
    await downloadFile(url, destPath);
    return { filename, ok: true };
  } catch (firstErr) {
    try {
      await downloadFile(url, destPath);
      return { filename, ok: true };
    } catch (secondErr) {
      return { filename, ok: false, error: secondErr.message };
    }
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const entries = Object.entries(FILES);
  const failed = [];

  for (const [filename, url] of entries) {
    const destPath = path.join(OUT_DIR, filename);
    const result = await downloadWithRetry(filename, url, destPath);
    if (result.ok) {
      const size = fs.statSync(destPath).size;
      console.log(`OK   ${filename} (${size} bytes)`);
    } else {
      failed.push(result.filename);
      console.error(`FAIL ${filename}: ${result.error}`);
    }
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} of ${entries.length} announcer clips failed to download:`);
    failed.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }

  console.log(`\nAll ${entries.length} announcer clips downloaded to ${OUT_DIR}`);
}

main();
