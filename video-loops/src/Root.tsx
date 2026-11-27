import React from 'react';
import { Composition } from 'remotion';
import { SakuraNotte, TempioCastello, SW, SH, D } from './Scenes';
import * as S2 from './Scenes2';

// Six seamless 120 s loops (3600 frames at 30 fps). Put the illustrations in public/ (see README).
export const Root: React.FC = () => (
  <>
    <Composition id="SakuraNight" component={SakuraNotte} durationInFrames={D} fps={30} width={SW} height={SH} />
    <Composition id="TempleCastle" component={TempioCastello} durationInFrames={D} fps={30} width={SW} height={SH} />
    <Composition id="SunsetHill" component={S2.CollinaTramonto} durationInFrames={D} fps={30} width={S2.SW} height={S2.SH} />
    <Composition id="VillageRiver" component={S2.FiumeVillaggio} durationInFrames={D} fps={30} width={S2.SW} height={S2.SH} />
    <Composition id="WinterAurora" component={S2.VillaggioAurora} durationInFrames={D} fps={30} width={S2.SW} height={S2.SH} />
    <Composition id="SunkenForest" component={S2.ForestaSommersa} durationInFrames={D} fps={30} width={S2.SW} height={S2.SH} />
  </>
);
