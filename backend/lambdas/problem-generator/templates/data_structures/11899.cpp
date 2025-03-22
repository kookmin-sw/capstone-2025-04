// BOJ - 11899 괄호 끼워넣기 ( EC#3 - Problem 18 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    string ss; cin >> ss;
    stack<char> stk;
    for(char ch : ss) {
        if(stk.empty()) {
            stk.push(ch); continue;
        }
        if(stk.top() == '(' && ch == ')') stk.pop();
        else stk.push(ch);
    }

    cout << stk.size() << '\n';
}