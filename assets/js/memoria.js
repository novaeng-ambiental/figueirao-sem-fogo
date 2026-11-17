/* Memória da campanha. Para acrescentar registros depois, edite as listas abaixo.
   Linha do tempo: só entra o que tem prova (foto datada, declaração, print). */
window.MEMORIA = {
  linhaTempo: [
    {
      data: "19 de outubro de 2026",
      texto: "Cartazes da campanha fixados em espaços de circulação de público, na área urbana de Figueirão.",
      prova: "Fotos datadas de 19/10/2026, das 8h13 às 9h33, em três endereços."
    },
    {
      data: "19 a 31 de outubro de 2026",
      texto: "Spot de rádio no ar na Rádio Recanto das Águas (Super FM): 30 inserções em 13 dias.",
      prova: "Declaração de veiculação da emissora."
    },
    {
      data: "Outubro de 2026",
      texto: "Campanha publicada na página da Prefeitura no Facebook e em notícia no site oficial da Prefeitura, com as artes do carrossel.",
      prova: "Prints registrados em 22/10/2026."
    }
  ],
  numeros: [
    { valor: "30", texto: "inserções do spot de rádio" },
    { valor: "13", texto: "dias de veiculação no rádio" },
    { valor: "3", texto: "endereços com cartaz registrados em foto" }
  ],
  fotos: [
    { src: "midia/fotos/foto-01.jpg", legenda: "Cartaz fixado em mural. 19/10/2026, Avenida Moisés Araújo Galvão, 591.", alt: "Cartaz da campanha Figueirão Sem Fogo preso em mural de cortiça." },
    { src: "midia/fotos/foto-02.jpg", legenda: "Registro junto ao mural com o cartaz. 19/10/2026, Rua Castro Alves, 474.", alt: "Três mulheres de pé, sorrindo, em frente a um mural onde está o cartaz da campanha." },
    { src: "midia/fotos/foto-03.jpg", legenda: "Cartaz fixado em parede de circulação. 19/10/2026, Rua Custódio, 420.", alt: "Cartaz da campanha fixado em parede branca de um corredor." },
    { src: "midia/fotos/foto-04.jpg", legenda: "Registro da fixação do cartaz. 19/10/2026, Rua Custódio, 420.", alt: "Duas mulheres sorrindo ao lado do cartaz da campanha; uma delas aponta para ele." },
    { src: "midia/fotos/foto-05.jpg", legenda: "Cartaz da campanha fixado.", alt: "Cartaz da campanha fixado sobre uma superfície verde." },
    { src: "midia/fotos/foto-06.jpg", legenda: "Cartaz da campanha em mural de avisos.", alt: "Cartaz da campanha em um mural de avisos, ao lado de outros papéis e cartazes." }
  ],
  artes: [
    { src: "midia/artes/post-1.jpg", legenda: "Carrossel, face 1: fauna e Comunidade Quilombola Santa Tereza", alt: "Arte do carrossel com o selo da campanha, um tatu e mãos plantando uma muda, com faixas Antes do fogo e Depois do fogo." },
    { src: "midia/artes/post-2.jpg", legenda: "Carrossel, face 2: Pedra Bonita e vegetação do Cerrado", alt: "Arte do carrossel com a Pedra Bonita e uma paisagem de Cerrado, com faixas Antes do fogo e Depois do fogo." },
    { src: "midia/artes/post-3.jpg", legenda: "Carrossel, face 3: a bituca de cigarro", alt: "Arte do carrossel com bitucas de cigarro no capim e as chamadas Ajude a preservar, Proteja a fauna e Não queime lixo." },
    { src: "midia/artes/post-4.jpg", legenda: "Carrossel, face 4: canais de denúncia", alt: "Arte do carrossel com os canais de denúncia: Corpo de Bombeiros 193, Polícia Militar Ambiental, Defesa Civil Estadual e Disque Denúncia 181." },
    { src: "midia/artes/folder-triptico-1.jpg", legenda: "Folder tríptico, lado de fora", alt: "Lado de fora do folder tríptico, com o selo, os canais de denúncia e as atitudes para proteger Figueirão." },
    { src: "midia/artes/folder-triptico-2.jpg", legenda: "Folder tríptico, lado de dentro", alt: "Lado de dentro do folder tríptico: por que o Cerrado é importante, o que existe em Figueirão e por que proteger." },
    { src: "midia/artes/folder-a5-1.jpg", legenda: "Folder A5", alt: "Folder A5 da campanha com o conteúdo sobre o Cerrado de Figueirão e os canais de denúncia." },
    { src: "midia/artes/cartaz-a2-1.jpg", legenda: "Cartaz A2", alt: "Cartaz A2 da campanha com o conteúdo sobre o Cerrado de Figueirão, a proibição da queima de resíduos e os canais de denúncia." }
  ],
  prints: [
    { src: "midia/docs/print-facebook.jpg", legenda: "Publicação na página da Prefeitura no Facebook. Registro de 22/10/2026.", alt: "Print da publicação Figueirão Sem Fogo na página da Prefeitura no Facebook." },
    { src: "midia/docs/print-site-prefeitura.jpg", legenda: "Notícia no site oficial da Prefeitura. Registro de 22/10/2026.", alt: "Print da notícia Figueirão Sem Fogo no site da Prefeitura de Figueirão, com a primeira arte do carrossel." }
  ],
  insercoes: [
    ["19", 2], ["20", 3], ["21", 2], ["22", 2], ["23", 2], ["24", 2], ["25", 2],
    ["26", 3], ["27", 2], ["28", 2], ["29", 2], ["30", 2], ["31", 2]
  ],
  /* Relatos: acrescente objetos { nome: "", lugar: "", texto: "", data: "" } com autorização de quem relatou. */
  relatos: []
};
