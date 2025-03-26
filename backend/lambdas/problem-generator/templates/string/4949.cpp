// BOJ - 4949 균형잡힌 세상

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

string exec(string s) {
    stack<char> stk;
    for(char ch : s) {
        char top = stk.empty() ? ' ' : stk.top();
        if(ch == '[' || ch == '(') stk.push(ch);
        else if(ch == ']' && top == '[') stk.pop();
        else if(ch == ')' && top == '(') stk.pop();
        else if(ch != '[' && ch != ']' && ch != '(' && ch != ')') continue;
        else return "no";
    }
    if(stk.empty()) return "yes"; return "no";
}

int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    while(1) {
        string ss; getline(cin, ss);
        if(ss == ".") return 0;
        cout << exec(ss) << '\n';
    }
}