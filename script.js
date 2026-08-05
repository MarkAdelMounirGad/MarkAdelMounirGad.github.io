fetch("contact.json")
  .then(response => response.json())
  .then(contact => {
    console.log(contact);
  })
  .catch(error => {
    console.error("Could not load contact information:", error);
  });
