class Node {
  constructor(key, value, next = null, prev = null) {
    this.key = key;
    this.value = value;
    this.next = next;
    this.prev = prev;
  }
}

class LRU {

  constructor(limit = 1000) {
    this.size = 0;
    this.limit = limit;
    this.head = null;
    this.tail = null;
    this.cache = {};
  }

  // Write to head of LinkedList
  write(key, value){
    this.ensureLimit();

    if(!this.head){
      this.head = this.tail = new Node(key, value);
    }else{
      const node = new Node(key, value, this.head.next);
      this.head.prev = node;
      const temp = this.head;
      this.head = node;
      this.head.next = temp;
    }

    //Update the cache map
    this.cache[key] = this.head;
    this.size++;
  }

  // Read from cache map and make that node as new Head of LinkedList
  read(key){
    if(this.cache[key]){
      const value = this.cache[key].value;
      const node = new Node(key, value);

      // node removed from it's position and cache
      this.remove(key)
      this.write(key, value);

      return value;
    }

    console.log(`Item not available in cache for key ${key}`);
  }

  contains(key){
    return (this.cache[key]);
  }

  ensureLimit(){
    if(this.size === this.limit){
      this.removeLast100();
    }
  }

  removeLast100(){
    var temp = this.tail;
    for (var i = 0; i < 100 && temp.prev !== null; i++){
      delete this.cache[temp.key];
      this.size--;
      temp = temp.prev;
    }
    temp.next = null;
    this.tail = temp;
  }

  remove(key){
    const node = this.cache[key];

    if(node.prev !== null){
      node.prev.next = node.next;
    }else{
      this.head = node.next;
    }

    if(node.next !== null){
      node.next.prev = node.prev;
    }else{
      this.tail = node.prev
    }

    delete this.cache[key];
    this.size--;
  }

  clear() {
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.cache = {};
  }

  // Invokes the callback function with every node of the chain and the index of the node.
  forEach(fn) {
    let node = this.head;
    let counter = 0;
    while (node) {
      fn(node, counter);
      node = node.next;
      counter++;
    }
  }

  // To iterate over LRU with a 'for...of' loop
  *[Symbol.iterator]() {
    let node = this.head;
    while (node) {
      yield node;
      node = node.next;
    }
  }
}