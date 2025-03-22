// BOJ - 3077 임진왜란 ( EC#3 - Problem 17 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    map<string, int> wm;
    loop(i, 1, n) {
        string ss; cin >> ss; wm[ss] = i;
    }

    vector<string> answer; answer.push_back("0");
    loop(i, 1, n) {
        string ss; cin >> ss; answer.push_back(ss);
    }

    int ans = 0;
    loop(i, 1, n) loop(j, i + 1, n)
        if(wm[answer[i]] < wm[answer[j]]) ans++;
    
    cout << ans << '/' << n * (n - 1) / 2 << '\n';
}