const fs = require('fs');
const mammoth = require('mammoth');

mammoth.extractRawText({path: "D:/AI projects/owlly/data_source/Guesstimates_Finance_Investment_Roles_India.docx"})
  .then(function(result){
      console.log("--- Extracted Text Preview ---");
      const text = result.value;
      console.log(text.substring(3500, 6000));
  })
  .catch(err => console.error(err));
