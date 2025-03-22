// BOJ - 8978 VLAK

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
ll n, k, p;
struct tii {
    ll a, b, c;
    bool operator<(const tii& o) const {
        if(a == o.a) {
            if(b == o.b) return c < o.c;
            return b < o.b;
        }
        return a < o.a;
    }
    bool operator>(const tii& o) const {
        if(a == o.a) {
            if(b == o.b) return c > o.c;
            return b > o.b;
        }
        return a > o.a;
    }
};
vector<string> car[11];
void put(string s) {
    vector<tii> v;
    loop(i, 1, n) {
        ll participants = car[i].size(), same = 0;
        for(string ss : car[i]) if(s[0] == ss[0]) same++;
        v.push_back({same, participants, i});
    }
    sort(v.begin(), v.end());
    for(tii t : v) {
        if(car[t.c].size() >= k) continue;
        car[t.c].push_back(s);
        return;
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    cin >> n >> k >> p;
    loop(i, 1, p) {
        string ss; cin >> ss;
        put(ss);
    }
    loop(i, 1, n) cout << car[i].size() << ' ';
    cout << '\n';
}