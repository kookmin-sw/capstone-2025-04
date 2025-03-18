// BOJ - 11507 카드셋트 ( EC#3 - Problem 12 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    string ss; cin >> ss; set<string> s;
    map<char, int> m;
    for(int i = 3; i <= ss.size(); i += 3) {
        string t = ss.substr(i - 3, 3);
        m[ss[i - 3]]++;
        if(!s.insert(t).second) {
            cout << "GRESKA\n"; return 0;
        }
    }

    cout << 13 - m['P'] << ' ' << 13 - m['K'] << ' ' << 13 - m['H'] << ' ' << 13 - m['T'] << '\n';
}