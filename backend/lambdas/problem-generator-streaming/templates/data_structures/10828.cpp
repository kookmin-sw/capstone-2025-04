// BOJ - 10828 스택

#include <iostream>
#include <stack>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)

using namespace std;

int main()
{
    ios::sync_with_stdio(false); cin.tie(0);

    stack<int> stk;

    int cmds; cin >> cmds;
    while(cmds--) {
        string s; cin >> s;
        if(s == "push") {
            int k; cin >> k;
            stk.push(k);
        }
        else if(s == "pop") {
            if(stk.empty()) cout << "-1\n";
            else cout << stk.top() << '\n', stk.pop();
        }
        else if(s == "size") {
            cout << stk.size() << '\n';
        }
        else if(s == "empty") {
            if(stk.empty()) cout << "1\n";
            else cout << "0\n";
        }
        else if(s == "top") {
            if(stk.empty()) cout << "-1\n";
            else cout << stk.top() << '\n';
        }
    }
}