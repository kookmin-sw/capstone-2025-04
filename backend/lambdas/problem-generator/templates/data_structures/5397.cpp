// BOJ - 5397 키로거 ( List STL Example Problem )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
void exec() {
    string ss; cin >> ss;
    list<char> lst; list<char>::iterator iter = lst.begin();
    for(char ch : ss) {
        // iter는 항상 문자앞 대기 (|) 라고 생각하면 편하다.
        if(ch == '<' && iter != lst.begin()) {
            iter--;
        }
        else if(ch == '>' && iter != lst.end()) {
            iter++;
        }
        else if(ch == '-' && iter != lst.begin()) {
            iter = lst.erase(--iter);
        }
        else if(ch != '<' && ch != '>' && ch != '-') {
            lst.insert(iter, ch);
        }
    }
    for(char ch : lst) cout << ch;
    cout << '\n';
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    int t; cin >> t;
    while(t--) exec();
}