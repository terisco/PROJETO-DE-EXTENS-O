const mongoose = require("mongoose");

const DoacaoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descricao: String,
  quantidade: String,
  validade_retirada: Date,
  status: { type: String, default: "disponivel" }, // disponivel, reservado, entregue

  // Localização para buscas geoespaciais
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
});

// Criando o índice para buscas por proximidade
DoacaoSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Doacao", DoacaoSchema);
