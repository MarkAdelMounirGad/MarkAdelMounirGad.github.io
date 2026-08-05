fetch("contact.json")
  .then(response => response.json())
  .then(contact => {

    console.log(contact);

    document.getElementById("name").textContent = contact.name;
    document.getElementById("title").textContent = contact.title;
    document.getElementById("organization").textContent = contact.organization;

  })
  .catch(error => {

    console.error(error);

  });
