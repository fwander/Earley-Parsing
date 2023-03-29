import HashSet from "./HashSet";
/* Grammar: 
 * S -> A C
 * S -> B
 * A -> 'a'
 * B -> 'b'
 * C -> 'c'
 */

type Rule = {
  lhs: Symbol;
  rhs: Symbol[];
}

type Item = {
  rule: Rule;
  dot: number;
  from: number;
  forest: ParseTree[];
}

function item_hash(item: Item): string{
  let ret = "";
  ret += Symbol[item.rule.lhs];
  ret += ","
  for (let i = 0; i < item.rule.rhs.length; i++) {
    if (item.dot === i) {
      ret += ".";
    }
    ret += Symbol[item.rule.rhs[i]];
    ret += ",";
  }
  if (item.dot === item.rule.rhs.length) {
    ret += "."
  }
  ret += "," + item.from.toString()
  return ret;
}

function item_str(item: Item): string{
  let ret = "";
  ret += Symbol[item.rule.lhs];
  ret += " -> "
  for (let i = 0; i < item.rule.rhs.length; i++) {
    if (item.dot === i) {
      ret += ". ";
    }
    ret += Symbol[item.rule.rhs[i]];
    ret += " ";
  }
  if (item.dot === item.rule.rhs.length) {
    ret += ". "
  }
  ret += "(" + item.from.toString() + ")";
  return ret;
}

//Begin Generated

enum Symbol {
  a,
  b,
  c,
  S,
  A,
  B,
  C,
};

const grammar: Rule[][] = [
  [ //S
    {lhs: Symbol.S, rhs: [Symbol.A,Symbol.C]},
    {lhs: Symbol.S, rhs: [Symbol.B]},
  ], 
  [ //A
    {lhs: Symbol.A, rhs: [Symbol.a]}
  ],
  [ //B
    {lhs: Symbol.B, rhs: [Symbol.b]}
  ],
  [ //C
    {lhs: Symbol.C, rhs: [Symbol.c]}
  ],
]

const nullable: boolean[] = [
  false,
  false,
  false,
  false,
]

const grammar_start = Symbol.S;

function is_term(s: Symbol){
  return s <= Symbol.c;
}

//End Generated

class ParseTree {
  children: ParseTree[] = [];
  data:Symbol;
  start:number;
  size:number;
  constructor(data: Symbol, start: number, children: ParseTree[]){
    this.data = data;
    this.start = start;
    this.size = 0;
    this.children = children;
  }
  clone() {
    let ret = new ParseTree(this.data, this.start, this.children);
    ret.size = this.size;
    return ret;
  }
}

function add_item(state_set: HashSet<Item>, unprocessed: Item[], adding: Item) {
  if (state_set.has(adding)) {
    return;
  }
  unprocessed.push(adding);
  state_set.add(adding);
}

const DEBUG = true;

export function parse(stream: Symbol[]){
  const len = stream.length;
  let state_sets: HashSet<Item>[] = new Array(len+1).fill(0).map(() => new HashSet<Item>(item_hash));
  grammar[0].forEach((rule)=>{
    state_sets[0].add({rule: rule, dot: 0, from: 0, forest: []})
  });

  for (let i = 0; i <= len; i++) {
    let unprocessed: Item[] = state_sets[i].to_array();
    while(unprocessed.length > 0){
      const item: Item = unprocessed.pop() as Item;
      const next_symbol = item.rule.rhs[item.dot];
      if(DEBUG) {
        console.log("looking at:", Symbol[stream[i]]);
      }
      if (is_term(next_symbol) && next_symbol === stream[i] && i < len){ //scan
        // if(DEBUG) {
        //   console.log("scanned:", item_str(item));
        // }
        let new_tree = new ParseTree(stream[i],i,[]);
        for (let tree of item.forest) {
          tree.children[item.dot] = new_tree;
        }
        state_sets[i+1].add({
          rule: item.rule,
          dot: item.dot+1,
          from: item.from,
          forest: item.forest,
        });
        continue;
      }
      if (next_symbol && !is_term(next_symbol)) { //predict
        // if(DEBUG) {
        //   console.log("predicting:", item_str(item));
        // }
        for (const rule of grammar[next_symbol - grammar_start]) {
          let parse_tree = new ParseTree(rule.lhs,i, []);
          add_item(state_sets[i], unprocessed, {
            rule: rule, 
            dot: 0, 
            from: i,
            forest: [parse_tree],
          });
        }
        continue;
      }
      if (item.dot === item.rule.rhs.length) { //complete
        // if(DEBUG) {
        //   console.log("complete:", item_str(item));
        // }
        for (const checking of state_sets[item.from].to_array()) {
          if (checking.rule.rhs[checking.dot] === item.rule.lhs){
            add_item(state_sets[i], unprocessed, {
              rule: checking.rule, 
              dot: checking.dot + 1, 
              from: checking.from,
              forest: [],
            });
          }
        }
        continue;
      }
    }
    if(DEBUG){
      console.log("==="+i.toString()+"===");
      for (const item of state_sets[i].to_array())
        console.log(item_str(item));
    }
  }
};

export function tokenize(stream: string){
  let ret: Symbol[] = [];
  for (const c of stream) {
    switch (c) {
      case 'a':
        ret.push(Symbol.a);
        break;
      case 'b':
        ret.push(Symbol.b);
        break;
      case 'c':
        ret.push(Symbol.c);
        break;
      default:
        break;
    }
  }
  return ret;
}
