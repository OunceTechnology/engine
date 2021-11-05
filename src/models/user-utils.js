function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w -]+/g, '')
    .replace(/ +/g, '-');
}

function toTitleCase(string_) {
  if (typeof string_ !== 'string') {
    return string_;
  }
  return string_.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  });
}

function fullname(name) {
  const fullname = name.first || name.last ? `${name.first} ${name.last}` : '';

  return toTitleCase(fullname);
}

export default {
  slugify,
  toTitleCase,
  fullname,
};
