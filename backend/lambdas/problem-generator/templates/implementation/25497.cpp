// BOJ - 25497 기술 연계마스터 임스

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    string ss; cin >> ss;
    int s = 0, l = 0, res = 0;
    for(char ch : ss) {
        if(ch == 'S') { s++; continue; }
        else if(ch == 'L') { l++; continue; }
        else if(ch == 'K' && !s) break;
        else if(ch == 'R' && !l) break;
        else if(ch == 'K') s--;
        else if(ch == 'R') l--;
        res++;
    }

    cout << res << '\n';
}