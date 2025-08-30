import  algoliasearch  from "algoliasearch";

const client = algoliasearch('SFEK12MH18', 'b86467b332eb79583686d1c15a79d8c2');

const algolia=client.initIndex("products");

export default algolia