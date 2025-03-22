// BOJ - 13417 카드 문자열 ( EC#3 - Problem 19 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
void exec() {
    int n; cin >> n;
    char m; deque<char> dq;
    loop(i, 1, n) {
        string ss; cin >> ss;
        if(i == 1) m = ss[0];
        if(ss[0] <= m) {
            dq.push_front(ss[0]); m = ss[0];
        }
        else dq.push_back(ss[0]);
    }

    for(char ch : dq) cout << ch;
    cout << '\n';
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int t; cin >> t;
    while(t--) exec();
}