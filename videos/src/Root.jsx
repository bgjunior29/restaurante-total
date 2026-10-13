import { Composition } from 'remotion'
import { AnuncioComissao, anuncioDuration } from './AnuncioComissao'
import { CardapioReel, reelDuration } from './CardapioReel'
import data from './cardapio.json'
import { NichoMG, NICHOS_MG } from './mg/Nichos'
import { MGAnuncioNegocios, MGAnuncioRestaurantes, MGApresentacao, MG_VOZES, mgDuracao } from './mg/MG'
import { AnuncioNegocios, AnuncioRestaurantes, Apresentacao, VOZES, duracao } from './movi/MoviVideos'

export const FPS = 30

export function Root() {
  return (
    <>
      <Composition
        id="CardapioReel"
        component={CardapioReel}
        durationInFrames={reelDuration(data, FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ data }}
      />
      <Composition
        id="AnuncioComissao"
        component={AnuncioComissao}
        durationInFrames={anuncioDuration(FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ data }}
      />
      <Composition id="MoviAnuncioNegocios" component={AnuncioNegocios} durationInFrames={duracao(VOZES.negocios)} fps={FPS} width={1080} height={1920} />
      <Composition id="MoviAnuncioRestaurantes" component={AnuncioRestaurantes} durationInFrames={duracao(VOZES.restaurantes)} fps={FPS} width={1080} height={1920} />
      <Composition id="MoviApresentacao" component={Apresentacao} durationInFrames={duracao(VOZES.apresentacao)} fps={FPS} width={1920} height={1080} />
      <Composition id="MGAnuncioNegocios" component={MGAnuncioNegocios} durationInFrames={mgDuracao(MG_VOZES.negocios)} fps={FPS} width={1080} height={1920} />
      <Composition id="MGAnuncioRestaurantes" component={MGAnuncioRestaurantes} durationInFrames={mgDuracao(MG_VOZES.restaurantes)} fps={FPS} width={1080} height={1920} />
      <Composition id="MGApresentacao" component={MGApresentacao} durationInFrames={mgDuracao(MG_VOZES.apresentacao)} fps={FPS} width={1920} height={1080} />
      {Object.entries(NICHOS_MG).map(([nicho, voz]) => (
        <Composition key={nicho} id={`MGNicho-${nicho}`} component={NichoMG} durationInFrames={mgDuracao(voz)} fps={FPS} width={1080} height={1920} defaultProps={{ nicho }} />
      ))}
    </>
  )
}
